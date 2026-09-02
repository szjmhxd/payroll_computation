// 摸鱼薪资计算器 - 主逻辑

// DOM 元素
const elements = {
    monthlySalary: document.getElementById('monthlySalary'),
    workStartTime: document.getElementById('workStartTime'),
    workEndTime: document.getElementById('workEndTime'),
    lunchStartTime: document.getElementById('lunchStartTime'),
    lunchEndTime: document.getElementById('lunchEndTime'),
    lunchDuration: document.getElementById('lunchDuration'),
    lunchIncluded: document.getElementById('lunchIncluded'),
    isDoubleRest: document.getElementById('isDoubleRest'),
    skipHoliday: document.getElementById('skipHoliday'),
    skipWeekend: document.getElementById('skipWeekend'),
    payDay: document.getElementById('payDay'),
    saveBtn: document.getElementById('saveBtn'),
    resetBtn: document.getElementById('resetBtn')
};

// 默认设置
const defaultSettings = {
    monthlySalary: 15000,
    workStartTime: '09:00',
    workEndTime: '18:00',
    lunchStartTime: '12:00',
    lunchEndTime: '13:00',
    lunchDuration: 60,
    lunchIncluded: true,
    isDoubleRest: true,
    skipHoliday: true,
    skipWeekend: true,
    payDay: 15
};

// 初始化 Flatpickr 时间选择器
function initTimePickers() {
    const timeOptions = {
        enableTime: true,
        noCalendar: true,
        dateFormat: 'H:i',
        time_24hr: true,
        minuteIncrement: 5,
        locale: 'zh',
        defaultHour: 9,
        defaultMinute: 0
    };

    // 初始化所有时间选择器
    flatpickr('#workStartTime', { ...timeOptions, defaultHour: 9, defaultMinute: 0 });
    flatpickr('#workEndTime', { ...timeOptions, defaultHour: 18, defaultMinute: 0 });
    flatpickr('#lunchStartTime', { ...timeOptions, defaultHour: 12, defaultMinute: 0 });
    flatpickr('#lunchEndTime', { ...timeOptions, defaultHour: 13, defaultMinute: 0 });
}

// 将时间字符串转换为分钟数
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// 将分钟数转换为时间字符串
function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// 午休时间三字段联动
function setupLunchTimeLinkage() {
    let lastModified = null; // 记录最后修改的字段

    // 午休开始时间变化 → 计算结束时间
    elements.lunchStartTime.addEventListener('change', () => {
        if (lastModified === 'duration') {
            // 如果最后修改的是时长，则计算结束时间
            const startMinutes = timeToMinutes(elements.lunchStartTime.value);
            const duration = parseInt(elements.lunchDuration.value) || 0;
            const endMinutes = startMinutes + duration;
            if (endMinutes <= 24 * 60) {
                elements.lunchEndTime.value = minutesToTime(endMinutes);
            }
        } else {
            // 否则计算时长
            calculateLunchDuration();
        }
        lastModified = 'start';
    });

    // 午休结束时间变化 → 计算时长
    elements.lunchEndTime.addEventListener('change', () => {
        if (lastModified === 'duration') {
            // 如果最后修改的是时长，则计算开始时间
            const endMinutes = timeToMinutes(elements.lunchEndTime.value);
            const duration = parseInt(elements.lunchDuration.value) || 0;
            const startMinutes = endMinutes - duration;
            if (startMinutes >= 0) {
                elements.lunchStartTime.value = minutesToTime(startMinutes);
            }
        } else {
            // 否则计算时长
            calculateLunchDuration();
        }
        lastModified = 'end';
    });

    // 午休时长变化 → 计算结束时间
    elements.lunchDuration.addEventListener('input', () => {
        const startMinutes = timeToMinutes(elements.lunchStartTime.value);
        const duration = parseInt(elements.lunchDuration.value) || 0;
        const endMinutes = startMinutes + duration;
        if (endMinutes <= 24 * 60) {
            elements.lunchEndTime.value = minutesToTime(endMinutes);
        }
        lastModified = 'duration';
    });

    function calculateLunchDuration() {
        const startMinutes = timeToMinutes(elements.lunchStartTime.value);
        const endMinutes = timeToMinutes(elements.lunchEndTime.value);
        const duration = endMinutes - startMinutes;
        if (duration >= 0) {
            elements.lunchDuration.value = duration;
        }
    }
}

// 保存设置到 localStorage
function saveSettings() {
    const settings = {
        monthlySalary: parseFloat(elements.monthlySalary.value) || 0,
        workStartTime: elements.workStartTime.value,
        workEndTime: elements.workEndTime.value,
        lunchStartTime: elements.lunchStartTime.value,
        lunchEndTime: elements.lunchEndTime.value,
        lunchDuration: parseInt(elements.lunchDuration.value) || 0,
        lunchIncluded: elements.lunchIncluded.checked,
        isDoubleRest: elements.isDoubleRest.checked,
        skipHoliday: elements.skipHoliday.checked,
        skipWeekend: elements.skipWeekend.checked,
        payDay: parseInt(elements.payDay.value) || 15
    };
    localStorage.setItem('touchFishPaySettings', JSON.stringify(settings));
    alert('设置已保存！');
}

// 从 localStorage 读取设置
function loadSettings() {
    const saved = localStorage.getItem('touchFishPaySettings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            elements.monthlySalary.value = settings.monthlySalary || defaultSettings.monthlySalary;
            elements.workStartTime.value = settings.workStartTime || defaultSettings.workStartTime;
            elements.workEndTime.value = settings.workEndTime || defaultSettings.workEndTime;
            elements.lunchStartTime.value = settings.lunchStartTime || defaultSettings.lunchStartTime;
            elements.lunchEndTime.value = settings.lunchEndTime || defaultSettings.lunchEndTime;
            elements.lunchDuration.value = settings.lunchDuration || defaultSettings.lunchDuration;
            elements.lunchIncluded.checked = settings.lunchIncluded !== undefined ? settings.lunchIncluded : defaultSettings.lunchIncluded;
            elements.isDoubleRest.checked = settings.isDoubleRest !== undefined ? settings.isDoubleRest : defaultSettings.isDoubleRest;
            elements.skipHoliday.checked = settings.skipHoliday !== undefined ? settings.skipHoliday : defaultSettings.skipHoliday;
            elements.skipWeekend.checked = settings.skipWeekend !== undefined ? settings.skipWeekend : defaultSettings.skipWeekend;
            elements.payDay.value = settings.payDay || defaultSettings.payDay;
        } catch (e) {
            console.error('读取设置失败:', e);
        }
    }
}

// 重置设置
function resetSettings() {
    if (confirm('确定要重置所有设置吗？')) {
        localStorage.removeItem('touchFishPaySettings');
        elements.monthlySalary.value = defaultSettings.monthlySalary;
        elements.workStartTime.value = defaultSettings.workStartTime;
        elements.workEndTime.value = defaultSettings.workEndTime;
        elements.lunchStartTime.value = defaultSettings.lunchStartTime;
        elements.lunchEndTime.value = defaultSettings.lunchEndTime;
        elements.lunchDuration.value = defaultSettings.lunchDuration;
        elements.lunchIncluded.checked = defaultSettings.lunchIncluded;
        elements.isDoubleRest.checked = defaultSettings.isDoubleRest;
        elements.skipHoliday.checked = defaultSettings.skipHoliday;
        elements.skipWeekend.checked = defaultSettings.skipWeekend;
        elements.payDay.value = defaultSettings.payDay;
        alert('设置已重置！');
    }
}

// 初始化
function init() {
    initTimePickers();
    setupLunchTimeLinkage();
    loadSettings();

    // 绑定按钮事件
    elements.saveBtn.addEventListener('click', saveSettings);
    elements.resetBtn.addEventListener('click', resetSettings);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
