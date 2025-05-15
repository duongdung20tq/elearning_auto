// 1. Hàm sleep
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 2. Tạo thông báo popup
function createNotification(message, timeouts) {
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = '#4CAF50';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.fontSize = '14px';
    notification.style.zIndex = '9999';
    notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    notification.innerText = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, timeouts);
}

// 3. Hàm chính
async function autoClickAnswers() {
    console.log("📥 Đang tải đáp án...");

    let array_answers = [];

    // 3.1 Tải file đáp án từ GitHub
    async function loadAnswersFromDrive() {
        const githubFileUrl = 'https://raw.githubusercontent.com/sonnc/FIS-Elearning/main/dapan.txt';
        try {
            createNotification(`Đang đọc dữ liệu đáp án, vui lòng chờ...`, 1000);
            const response = await fetch(githubFileUrl);
            const text = await response.text();
            array_answers = text.split(',').map(num => parseInt(num.trim()));
            console.log("📖 Dữ liệu đã đọc:", array_answers);
        } catch (error) {
            console.error("❌ Lỗi khi tải tệp:", error);
        }
    }

    await loadAnswersFromDrive();

    // 3.2 Lấy tất cả input từ iframe (cùng origin)
    let allInputs = [];

    const frames = document.getElementsByTagName('iframe');
    for (let frame of frames) {
        try {
            const doc = frame.contentDocument || frame.contentWindow.document;
            const inputs = Array.from(doc.querySelectorAll('input[knv3-title]'));
            allInputs = allInputs.concat(inputs);
        } catch (e) {
            console.warn("⚠️ Không thể truy cập iframe do CORS:", e);
        }
    }

    // 3.3 Lấy tất cả knv3-title và loại trùng
    const allTitles = Array.from(new Set(allInputs.map(input => input.getAttribute('knv3-title'))));

    let manuallyAnsweredCount = 0;
    let autoAnsweredCount = 0;

    // 4. Hàm phụ trợ
    function getAnswerText(input) {
        const parent = input.closest('.col-sm-12');
        if (parent) {
            const answerFormat = parent.querySelector('.answer_left_format');
            if (answerFormat) {
                return answerFormat.innerText.trim();
            }
        }
        return '[Không rõ đáp án]';
    }

    function getQuestionTitle(input) {
        const ul = input.closest('ul');
        if (ul) {
            const header = ul.querySelector('.modal-header');
            if (header) {
                const match = header.textContent.match(/Câu hỏi số\s*\d+/i);
                return match ? match[0].trim() : '[Không rõ câu hỏi]';
            }
        }
        return '[Không rõ câu hỏi]';
    }

    function showAnswerFormat(input) {
        const parent = input.closest('.col-sm-12');
        if (parent) {
            const answerFormat = parent.querySelector('.answer_left_format');
            if (answerFormat) {
                answerFormat.style.display = 'block';
            }
        }
    }

    // 5. Hàm xử lý từng câu hỏi
    async function ensureAnswered(knv3Title) {
        let foundInputs = [];

        for (let frame of document.querySelectorAll('iframe')) {
            try {
                const doc = frame.contentDocument || frame.contentWindow.document;
                const inputs = Array.from(doc.querySelectorAll(`input[knv3-title="${knv3Title}"]`));
                if (inputs.length > 0) {
                    foundInputs = foundInputs.concat(inputs);
                }
            } catch (e) {
                console.warn("Không thể truy cập iframe:", e);
            }
        }

        if (foundInputs.length === 0) {
            console.log(`⚠️ Không tìm thấy input nào với knv3-title = ${knv3Title}`);
            return;
        }

        for (const input of foundInputs) {
            const id = parseInt(input.id);
            if (!isNaN(id) && array_answers.includes(id)) {
                input.disabled = false;
                input.click();
                console.log(`✔️ Clicked input với ID: ${id}`);
            }
        }

        const checkedInput = foundInputs.find(input => input.checked);
        const questionTitle = getQuestionTitle(foundInputs[0]);

        await sleep(1500);

        if (checkedInput) {
            manuallyAnsweredCount++;
            const answer = getAnswerText(checkedInput);
            showAnswerFormat(checkedInput);
            createNotification(`✅ ${questionTitle} | Đáp án: ${answer}`, 1000);
        } else {
            autoAnsweredCount++;
            const randomInput = foundInputs[ Math.floor(Math.random() * (foundInputs.length - 1)) + 1];
            if (randomInput.disabled) {
                randomInput.disabled = false;
            }
            randomInput.click();
            const answer = getAnswerText(randomInput);
            showAnswerFormat(randomInput);
            createNotification(`🟡 ${questionTitle} | Tự động chọn đáp án: ${answer}`, 1000);
        }
    }

    // 6. Thực hiện lần lượt cho từng câu hỏi
    for (const title of allTitles) {
        await ensureAnswered(title);
    }

    // 7. Thống kê kết quả
    setTimeout(() => {
        const total = manuallyAnsweredCount + autoAnsweredCount;
        const percentManual = total > 0 ? ((manuallyAnsweredCount / total) * 100).toFixed(2) : 0;
        const resultMessage = `Kết quả:\n\n✅ Câu đúng: ${manuallyAnsweredCount}\n🎲 Chọn ngẫu nhiên: ${autoAnsweredCount}\n📊 Tỷ lệ đúng: ${percentManual}%`;
        console.log(resultMessage);
        createNotification(resultMessage, 3000);
    }, 1000);
}

// Gọi hàm chính
autoClickAnswers();
