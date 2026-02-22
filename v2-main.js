/**
 * 雞米花排版 Pro V2 - 側邊欄版核心邏輯
 */

const a4Page = document.getElementById('a4-page');
const singleInput = document.getElementById('singleInput');
const batchInput = document.getElementById('batchInput');
const previewScaler = document.getElementById('preview-scaler');
const loadingToast = document.getElementById('loading-toast');
const menuToggle = document.getElementById('menu-toggle');

/**
 * 手機版選單切換
 */
function toggleMenu() {
    const isClosed = document.body.classList.contains('mobile-closed');
    if (isClosed) {
        document.body.classList.remove('mobile-closed');
        document.body.classList.add('mobile-open');
        menuToggle.innerHTML = '<span class="icon">👁️</span><span class="text">查看畫布</span>';
    } else {
        document.body.classList.remove('mobile-open');
        document.body.classList.add('mobile-closed');
        menuToggle.innerHTML = '<span class="icon">⚙️</span><span class="text">開啟設定</span>';
    }
}

/**
 * 在手機版執行操作後自動關閉選單，以便查看結果
 */
function autoCloseMenuOnMobile() {
    if (window.innerWidth <= 900) {
        document.body.classList.remove('mobile-open');
        document.body.classList.add('mobile-closed');
        menuToggle.innerHTML = '<span class="icon">⚙️</span><span class="text">開啟設定</span>';
    }
}

let activeBox = null;

/**
 * 響應式縮放邏輯 (V2 改進版：適配側邊欄寬度)
 */
function updatePreviewScale() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const isMobile = windowWidth <= 900;

    // 扣除側邊欄寬度 (320px)
    const availableWidth = isMobile ? windowWidth - 40 : windowWidth - 320 - 80;
    const availableHeight = isMobile ? windowHeight - 200 : windowHeight - 80;

    const baseWidth = 794;
    const baseHeight = 1123;

    // 找出寬度與高度合適的最小縮放比
    let scaleW = availableWidth / baseWidth;
    let scaleH = availableHeight / baseHeight;
    let scale = Math.min(scaleW, scaleH);

    // 限制最大縮放
    if (scale > 0.8) scale = 0.8;

    previewScaler.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', updatePreviewScale);
updatePreviewScale();

// 基礎功能與 V1 保持一致，但確保引用正確 ID
function createPhotoBox(sizeClass) {
    const box = document.createElement('div');
    box.className = `photo-box ${sizeClass}`;
    box.onclick = (e) => {
        if (e.target.closest('.mini-btn')) return;
        activeBox = box;
        singleInput.value = '';
        singleInput.click();
    };
    const actions = document.createElement('div');
    actions.className = 'box-actions';
    const del = document.createElement('button');
    del.className = 'mini-btn'; del.innerHTML = '✕';
    del.onclick = (e) => { e.stopPropagation(); box.remove(); };
    actions.appendChild(del);
    box.appendChild(actions);
    box.appendChild(document.createElement('img'));
    return box;
}

function appendToA4(el) {
    a4Page.appendChild(el);
    if (a4Page.scrollHeight > a4Page.clientHeight + 5) {
        alert('空間不足！'); el.remove(); return false;
    }
    return true;
}

function addBox(cls) {
    if (appendToA4(createPhotoBox(cls))) autoCloseMenuOnMobile();
}

function addCombo15() {
    const row = document.createElement('div'); row.className = 'row';
    row.appendChild(createPhotoBox('s15'));
    const v = document.createElement('div'); v.className = 'v-stack';
    v.appendChild(createPhotoBox('s5')); v.appendChild(createPhotoBox('s5')); v.appendChild(createPhotoBox('s5'));
    row.appendChild(v);
    if (appendToA4(row)) autoCloseMenuOnMobile();
}

function addCombo10() {
    const row = document.createElement('div'); row.className = 'row';
    row.appendChild(createPhotoBox('s10'));
    for (let i = 0; i < 2; i++) {
        const v = document.createElement('div'); v.className = 'v-stack';
        v.appendChild(createPhotoBox('s5')); v.appendChild(createPhotoBox('s5'));
        row.appendChild(v);
    }
    if (appendToA4(row)) autoCloseMenuOnMobile();
}

function clearAll() {
    if (confirm('確定要清空嗎？')) {
        a4Page.innerHTML = '';
        autoCloseMenuOnMobile();
    }
}

singleInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file && activeBox) readFile(file, (url) => updateBox(activeBox, url));
};

function triggerFillAll() {
    if (document.querySelectorAll('.photo-box').length === 0) return alert('請先新增格子！');
    batchInput.click();
}

batchInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        readFile(file, (url) => {
            document.querySelectorAll('.photo-box').forEach(box => updateBox(box, url));
        });
    }
};

function updateBox(box, url) {
    const img = box.querySelector('img');
    img.src = url; box.classList.add('has-img');
}

function readFile(file, cb) {
    const r = new FileReader(); r.onload = (e) => cb(e.target.result); r.readAsDataURL(file);
}

async function handleExport() {
    if (document.querySelectorAll('.photo-box').length === 0) return;
    const btn = document.getElementById('exportBtn');
    btn.disabled = true; loadingToast.style.display = 'block';
    await new Promise(r => setTimeout(r, 600));
    try {
        const canvas = await html2canvas(a4Page, {
            scale: 4, useCORS: true, backgroundColor: '#BC4C41',
            width: 794, height: 1123, // 使用整數避開亞像素渲染問題
            onclone: (clonedDoc) => {
                const s = clonedDoc.getElementById('preview-scaler');
                const a = clonedDoc.getElementById('a4-page');

                // 移除陰影與任何可能溢出的樣式
                if (s) {
                    s.style.transform = 'none';
                    s.style.width = '794px';
                    s.style.height = '1123px';
                    s.style.boxShadow = 'none';
                    s.style.margin = '0';
                    s.style.padding = '0';
                }

                if (a) {
                    a.style.width = '794px';
                    a.style.height = '1123px';
                    a.style.margin = '0';
                    a.style.position = 'fixed'; // 固定位置確保 capture
                    a.style.top = '0';
                    a.style.left = '0';
                    a.style.border = 'none';
                    a.style.boxShadow = 'none'; // 移除內陰影
                }
            }
        });
        const url = canvas.toDataURL('image/png');
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            document.getElementById('final-image').src = url;
            document.getElementById('result-overlay').style.display = 'flex';
        } else {
            const l = document.createElement('a'); l.download = `春聯V2_${Date.now()}.png`; l.href = url; l.click();
        }
    } catch (e) { console.error(e); alert('失敗'); }
    finally { btn.disabled = false; loadingToast.style.display = 'none'; }
}
