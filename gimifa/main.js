/**
 * 雞米花春聯排版工具 Pro - 核心邏輯
 */

const a4Page = document.getElementById('a4-page');
const singleInput = document.getElementById('singleInput');
const batchInput = document.getElementById('batchInput');
const previewScaler = document.getElementById('preview-scaler');
const loadingToast = document.getElementById('loading-toast');

let activeBox = null;

/**
 * 響應式旋轉與縮放預覽，確保 A4 頁面完整顯示在螢幕內
 */
function updatePreviewScale() {
    const windowWidth = window.innerWidth;
    const isMobile = windowWidth <= 600;

    // 計算縮放比例
    // A4 寬度約 210mm (在 96 DPI 下約 794px)
    const baseWidth = 794;
    let scale = (windowWidth * 0.9) / baseWidth;

    if (scale > 0.5 && !isMobile) scale = 0.5; // 電腦端最大 50%
    if (scale > 0.35 && isMobile) scale = 0.35; // 手機端最大 35%

    previewScaler.style.transform = `scale(${scale})`;

    // 計算補償高度，避免下方留白過多或被遮擋
    const a4HeightPx = 1123 * scale;
    document.querySelector('.preview-stage').style.height = `${a4HeightPx + 100}px`; // 增加補償到 100px
}

window.addEventListener('resize', updatePreviewScale);
updatePreviewScale();

/**
 * 建立一個格子元素
 */
function createPhotoBox(sizeClass) {
    const box = document.createElement('div');
    box.className = `photo-box ${sizeClass}`;

    // 預留點擊上傳事件
    box.onclick = (e) => {
        if (e.target.closest('.mini-btn')) return; // 如果點到功能按鈕則不觸發上傳
        activeBox = box;
        singleInput.value = '';
        singleInput.click();
    };

    // 操作按鈕 (更換/刪除)
    const actions = document.createElement('div');
    actions.className = 'box-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'mini-btn';
    deleteBtn.innerHTML = '✕';
    deleteBtn.title = '刪除此格';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        box.remove();
    };

    actions.appendChild(deleteBtn);
    box.appendChild(actions);

    const img = document.createElement('img');
    box.appendChild(img);

    return box;
}

/**
 * 加入 A4 並檢查是否溢出
 */
function appendToA4(el) {
    a4Page.appendChild(el);
    // 檢查高度是否溢出 A4 邊界 (容許一點誤差)
    if (a4Page.scrollHeight > a4Page.clientHeight + 5) {
        alert('空間不足，無法放入更多內容！');
        el.remove();
        return false;
    }
    return true;
}

/**
 * 基礎尺寸新增
 */
function addBox(sizeClass) {
    appendToA4(createPhotoBox(sizeClass));
}

/**
 * 複合尺寸組合: 15cm (15+5*3)
 */
function addCombo15() {
    const row = document.createElement('div');
    row.className = 'row';
    row.appendChild(createPhotoBox('s15'));

    const vStack = document.createElement('div');
    vStack.className = 'v-stack';
    vStack.appendChild(createPhotoBox('s5'));
    vStack.appendChild(createPhotoBox('s5'));
    vStack.appendChild(createPhotoBox('s5'));

    row.appendChild(vStack);
    appendToA4(row);
}

/**
 * 複合尺寸組合: 10cm (10+5*4)
 */
function addCombo10() {
    const row = document.createElement('div');
    row.className = 'row';
    row.appendChild(createPhotoBox('s10'));

    for (let i = 0; i < 2; i++) {
        const vStack = document.createElement('div');
        vStack.className = 'v-stack';
        vStack.appendChild(createPhotoBox('s5'));
        vStack.appendChild(createPhotoBox('s5'));
        row.appendChild(vStack);
    }

    appendToA4(row);
}

/**
 * 全部清空
 */
function clearAll() {
    if (confirm('確定要清空所有內容嗎？')) {
        a4Page.innerHTML = '';
    }
}

/**
 * 處理單張圖片上傳
 */
singleInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file && activeBox) {
        readFileAsDataURL(file, (dataUrl) => {
            updateBoxContent(activeBox, dataUrl);
        });
    }
};

/**
 * 處理批次圖片上傳
 */
function triggerFillAll() {
    const boxes = document.querySelectorAll('.photo-box');
    if (boxes.length === 0) {
        alert('請先新增一些格子！');
        return;
    }
    batchInput.value = '';
    batchInput.click();
}

batchInput.onchange = (e) => {
    const file = e.target.files[0]; // 只取第一張圖
    if (!file) return;

    const boxes = document.querySelectorAll('.photo-box');
    readFileAsDataURL(file, (dataUrl) => {
        boxes.forEach(box => updateBoxContent(box, dataUrl)); // 全部填入同一張圖
    });
};

/**
 * 更新格子內容 (加入圖片)
 */
function updateBoxContent(box, dataUrl) {
    const img = box.querySelector('img');
    img.src = dataUrl;
    box.classList.add('has-img');
}

/**
 * 讀取檔案為 DataURL
 */
function readFileAsDataURL(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => callback(e.target.result);
    reader.readAsDataURL(file);
}

/**
 * 核心導出功能
 */
async function handleExport() {
    if (document.querySelectorAll('.photo-box').length === 0) {
        alert('畫面上沒有任何內容。');
        return;
    }

    const exportBtn = document.getElementById('exportBtn');
    exportBtn.disabled = true;
    loadingToast.style.display = 'block';

    // 延遲一下確保圖片解碼
    await new Promise(r => setTimeout(r, 600));

    try {
        const canvas = await html2canvas(a4Page, {
            scale: 4, // 高解析度
            useCORS: true,
            backgroundColor: '#BC4C41',
            logging: false,
            // 確保捕捉正確的寬度與高度 (依照 A4 物理比例)
            width: 793.7,  // 210mm @ 96dpi
            height: 1122.5, // 297mm @ 96dpi
            onclone: (clonedDoc) => {
                // 關鍵：在克隆出的環境中，移除父層的縮放，並確保節點尺寸固定
                const clonedScaler = clonedDoc.getElementById('preview-scaler');
                const clonedA4 = clonedDoc.getElementById('a4-page');

                if (clonedScaler) {
                    clonedScaler.style.transform = 'none';
                    clonedScaler.style.width = '793.7px';
                    clonedScaler.style.height = '1122.5px';
                }

                if (clonedA4) {
                    clonedA4.style.width = '793.7px';
                    clonedA4.style.height = '1122.5px';
                    clonedA4.style.margin = '0';
                    clonedA4.style.position = 'absolute';
                    clonedA4.style.top = '0';
                    clonedA4.style.left = '0';
                }
            }
        });

        const dataUrl = canvas.toDataURL('image/png');
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            document.getElementById('final-image').src = dataUrl;
            document.getElementById('result-overlay').style.display = 'flex';
        } else {
            const link = document.createElement('a');
            link.download = `雞米花春聯_${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        }

    } catch (err) {
        console.error(err);
        alert('生成高畫質圖片失敗，請嘗試減少圖片數量或壓縮圖片。');
    } finally {
        exportBtn.disabled = false;
        loadingToast.style.display = 'none';
    }
}
