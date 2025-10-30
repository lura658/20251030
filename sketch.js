let table; // 儲存從 CSV 載入的資料
let questions = []; // 儲存格式化後的題目物件
let currentQuestionIndex = 0;
let score = 0;
let quizState = 'loading'; // 'loading', 'question', 'result'
let resultAnimation = null; // 儲存結果動畫的類型

// 特效變數
let cursorParticle = []; // 游標拖尾粒子
let selectedOption = null; // 當前選中的選項 (A, B, C)
let selectionEffectTimer = 0; // 選項選取特效的計時器

// 測驗題目的結構
class Question {
    constructor(row) {
        this.question = row.getString('question');
        this.options = [
            { id: 'A', text: row.getString('optionA'), correct: false },
            { id: 'B', text: row.getString('optionB'), correct: false },
            { id: 'C', text: row.getString('optionC'), correct: false }
        ];
        // 標記正確答案
        const correctAnswerId = row.getString('correctAnswer');
        this.options.forEach(opt => {
            if (opt.id === correctAnswerId) {
                opt.correct = true;
            }
        });
    }
}

// 在 setup() 和 draw() 之前載入 CSV 檔案
function preload() {
    // 載入 questions.csv，使用 'csv' 分隔符號和 'header' (包含欄位名稱)
    table = loadTable('questions.csv', 'csv', 'header');
}

function setup() {
    // 創建畫布，並將其放入 'quiz-container' 元素中
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('quiz-container'); 
    
    // 處理載入的表格資料
    if (table) {
        for (let r = 0; r < table.getRowCount(); r++) {
            questions.push(new Question(table.getRow(r)));
        }
        if (questions.length > 0) {
            quizState = 'question'; // 載入成功，開始測驗
        } else {
            quizState = 'error';
            console.error("CSV 檔案中沒有題目。");
        }
    } else {
        quizState = 'error';
        console.error("無法載入 CSV 檔案。");
    }
    
    textAlign(LEFT, CENTER);
    textSize(18);
    // 設定滑鼠游標特效的初始粒子
    for(let i = 0; i < 5; i++) {
        cursorParticle.push(new Particle(mouseX, mouseY));
    }
}

function draw() {
    background(240); // 淺灰色背景
    
    // 繪製滑鼠游標特效
    drawCursorEffect();

    // 根據測驗狀態繪製不同內容
    if (quizState === 'question') {
        displayQuestion();
    } else if (quizState === 'result') {
        displayResult();
    } else if (quizState === 'loading') {
        drawLoading();
    } else if (quizState === 'error') {
        drawError();
    }
    
    // 繪製自定義游標
    drawCustomCursor();
}

// 處理滑鼠點擊
function mousePressed() {
    if (quizState === 'question') {
        const currentQ = questions[currentQuestionIndex];
        const optionHeight = 60;
        const startY = height / 2 - 50;

        for (let i = 0; i < currentQ.options.length; i++) {
            const y = startY + i * (optionHeight + 10);
            
            // 檢查滑鼠是否點擊在選項範圍內 (這裡簡單檢查選項B)
            if (mouseX > 100 && mouseX < width - 100 && mouseY > y && mouseY < y + optionHeight) {
                selectedOption = currentQ.options[i].id; // 記錄選取的選項
                selectionEffectTimer = 30; // 啟動選項特效計時 (約 0.5 秒)
                
                // 延遲處理答案和下一題，讓特效有時間顯示
                setTimeout(() => {
                    handleAnswer(currentQ.options[i].correct);
                }, 500); 
                return; // 處理完畢，退出迴圈
            }
        }
    } else if (quizState === 'result') {
        // 在結果畫面點擊重新開始
        currentQuestionIndex = 0;
        score = 0;
        quizState = 'question';
        resultAnimation = null;
    }
}

// 處理答案
function handleAnswer(isCorrect) {
    if (isCorrect) {
        score++;
    }
    
    // 重設選取狀態和特效
    selectedOption = null;
    selectionEffectTimer = 0;
    
    currentQuestionIndex++;
    if (currentQuestionIndex >= questions.length) {
        // 所有題目作答完畢，進入結果畫面
        quizState = 'result';
        calculateResultAnimation();
    } else {
        // 進入下一題
        quizState = 'question';
    }
}

// 繪製當前題目
function displayQuestion() {
    const currentQ = questions[currentQuestionIndex];
    const optionHeight = 60;
    const startY = height / 2 - 50;

    // 繪製進度
    textSize(16);
    fill(100);
    text(`第 ${currentQuestionIndex + 1} / ${questions.length} 題`, width - 150, 30);

    // 繪製題目
    textSize(24);
    fill(50);
    textWrap(WORD);
    text(currentQ.question, 100, 100, width - 200, 50);

    // 繪製選項
    textSize(20);
    currentQ.options.forEach((opt, i) => {
        const x = 100;
        const y = startY + i * (optionHeight + 10);
        const w = width - 200;
        const h = optionHeight;

        // 選項背景和邊框
        noFill();
        stroke(150);
        strokeWeight(2);
        
        let bgColor = color(255);
        
        // 游標懸停特效
        if (mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h) {
            bgColor = color(200, 230, 255, 180); // 懸停時的淺藍色
        }
        
        // 選取特效
        if (opt.id === selectedOption) {
            const pulse = map(selectionEffectTimer, 30, 0, 0, 255);
            bgColor = color(255, 100, 100, pulse); // 點擊時的紅色脈衝
            selectionEffectTimer = max(0, selectionEffectTimer - 1); // 減少計時器
        }
        
        fill(bgColor);
        rect(x, y, w, h, 10); // 圓角矩形

        // 選項文字
        fill(50);
        text(`${opt.id}. ${opt.text}`, x + 20, y + h / 2);
    });
}

// 決定結果動畫類型
function calculateResultAnimation() {
    const total = questions.length;
    const percentage = score / total;

    if (percentage === 1.0) {
        resultAnimation = 'praise_perfect'; // 100% 正確
    } else if (percentage >= 0.8) {
        resultAnimation = 'praise_great'; // 80% 或以上
    } else if (percentage >= 0.5) {
        resultAnimation = 'encourage_good'; // 50% 或以上
    } else {
        resultAnimation = 'encourage_tryagain'; // 低於 50%
    }
}

// 繪製結果畫面和動畫
function displayResult() {
    // 基本結果文字
    fill(50);
    textSize(32);
    text('測驗結果', width / 2 - 80, height / 2 - 150);
    textSize(48);
    text(`你的分數: ${score} / ${questions.length}`, width / 2 - 180, height / 2 - 50);
    
    // 根據結果類型繪製動畫
    push();
    translate(width / 2, height / 2); // 移動到中心點
    
    if (resultAnimation === 'praise_perfect') {
        drawPerfectPraise();
    } else if (resultAnimation === 'praise_great') {
        drawGreatPraise();
    } else if (resultAnimation === 'encourage_good') {
        drawGoodEncourage();
    } else if (resultAnimation === 'encourage_tryagain') {
        drawTryAgainEncourage();
    }
    
    pop();

    // 重新開始按鈕
    const buttonW = 200;
    const buttonH = 50;
    const buttonX = width / 2 - buttonW / 2;
    const buttonY = height - 100;
    
    let buttonColor = color(0, 150, 255);
    if (mouseX > buttonX && mouseX < buttonX + buttonW && mouseY > buttonY && mouseY < buttonY + buttonH) {
        buttonColor = color(0, 180, 255); // 懸停效果
    }
    
    fill(buttonColor);
    rect(buttonX, buttonY, buttonW, buttonH, 10);
    fill(255);
    textSize(20);
    text('重新開始', buttonX + buttonW / 2 - 50, buttonY + buttonH / 2);
}

// --- 成績動畫 (範例) ---

let stars = []; // 用於 perfect_praise

function drawPerfectPraise() {
    // 滿分動畫：閃爍的星星和「完美！」文字
    if (frameCount % 10 === 0) {
        stars.push({
            x: random(-200, 200), 
            y: random(-200, 0), 
            size: random(10, 30), 
            alpha: 255, 
            speed: random(1, 3)
        });
    }

    for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.y += s.speed;
        s.alpha -= 5;
        
        fill(255, 223, 0, s.alpha); // 金色
        noStroke();
        ellipse(s.x, s.y, s.size);
        
        if (s.alpha < 0) {
            stars.splice(i, 1);
        }
    }
    
    fill(255, 223, 0);
    textSize(60 + sin(frameCount * 0.1) * 10); // 脈衝效果
    text('太棒了！完美！', -180, 50);
}

function drawGreatPraise() {
    // 優秀動畫：上升的氣泡和「做得好」文字
    fill(50, 200, 50); // 綠色
    textSize(50 + cos(frameCount * 0.08) * 5); 
    text('做得好！', -100, 50);

    // 簡單的氣泡上升
    for(let i = 0; i < 5; i++) {
        let x = sin(frameCount * 0.05 + i) * 50 + i * 20 - 50;
        let y = map((frameCount + i * 15) % 150, 0, 150, 150, -100);
        let s = 10 + sin(frameCount * 0.1) * 3;
        
        fill(100, 255, 100, 150);
        ellipse(x, y, s);
    }
}

function drawGoodEncourage() {
    // 及格鼓勵：輕微波動的線條和「還不錯」文字
    fill(255, 165, 0); // 橙色
    textSize(40);
    text('還不錯！繼續努力！', -180, 50);
    
    // 波動的鼓勵線
    noFill();
    stroke(255, 165, 0, 150);
    strokeWeight(4);
    beginShape();
    for(let x = -width/2; x < width/2; x += 10) {
        let y = sin(x * 0.05 + frameCount * 0.05) * 20;
        vertex(x, y + 100);
    }
    endShape();
}

function drawTryAgainEncourage() {
    // 不及格鼓勵：簡單的閃爍文字和「下次會更好」
    let alpha = map(sin(frameCount * 0.1), -1, 1, 150, 255);
    fill(255, 50, 50, alpha); // 紅色閃爍
    textSize(40);
    text('下次會更好！', -150, 50);
    
    fill(50);
    textSize(20);
    text('不要氣餒，再來一次!', -100, 100);
}

// --- 游標特效 ---

// 繪製自定義游標
function drawCustomCursor() {
    push();
    noStroke();
    fill(255, 0, 150); // 粉紅色
    ellipse(mouseX, mouseY, 8, 8); // 小圓點
    stroke(255, 0, 150, 150);
    strokeWeight(1);
    noFill();
    ellipse(mouseX, mouseY, 15, 15); // 外圍光圈
    pop();
}

// 游標拖尾粒子
function drawCursorEffect() {
    // 每隔幾幀生成一個新粒子
    if (frameCount % 3 === 0) {
        cursorParticle.push(new Particle(mouseX, mouseY));
    }

    // 更新並繪製粒子
    for (let i = cursorParticle.length - 1; i >= 0; i--) {
        cursorParticle[i].update();
        cursorParticle[i].display();
        
        // 移除消逝的粒子
        if (cursorParticle[i].isFinished()) {
            cursorParticle.splice(i, 1);
        }
    }
}

class Particle {
    constructor(x, y) {
        this.position = createVector(x, y);
        this.velocity = createVector(random(-1, 1), random(-1, 1));
        this.lifespan = 255;
        this.size = random(3, 8);
    }

    update() {
        this.position.add(this.velocity);
        this.lifespan -= 5;
    }

    display() {
        noStroke();
        // 隨著生命值衰減，顏色也變淡
        fill(255, 200, 0, this.lifespan); // 黃色拖尾
        ellipse(this.position.x, this.position.y, this.size);
    }

    isFinished() {
        return this.lifespan < 0;
    }
}

// 載入和錯誤狀態的繪製
function drawLoading() {
    fill(50);
    textSize(30);
    text('載入中...', width / 2 - 80, height / 2);
}

function drawError() {
    fill(255, 0, 0);
    textSize(30);
    text('錯誤: 無法載入題目。', width / 2 - 150, height / 2);
}