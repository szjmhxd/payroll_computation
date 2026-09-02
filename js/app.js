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
    resetBtn: document.getElementById('resetBtn'),
    // 显示元素
    todayAmount: document.getElementById('todayAmount'),
    progressBar: document.getElementById('progressBar'),
    progressPercent: document.getElementById('progressPercent'),
    countdown: document.getElementById('countdown'),
    statusBadge: document.getElementById('statusBadge'),
    monthEarned: document.getElementById('monthEarned'),
    hourlyRate: document.getElementById('hourlyRate'),
    perSecond: document.getElementById('perSecond'),
    paydayCountdown: document.getElementById('paydayCountdown')
};

// 定时器ID
let updateTimer = null;

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

// ============ 薪资计算核心逻辑 ============

// 获取当前设置
function getCurrentSettings() {
    return {
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
}

// 计算月工作日天数
function getMonthWorkDays(isDoubleRest) {
    // 简化计算：双休约21.75天，单休约25.75天
    return isDoubleRest ? 21.75 : 25.75;
}

// 计算日工作时长（秒）
function getDailyWorkSeconds(settings) {
    const startMinutes = timeToMinutes(settings.workStartTime);
    const endMinutes = timeToMinutes(settings.workEndTime);
    let workMinutes = endMinutes - startMinutes;

    // 如果午休不计入薪资，减去午休时长
    if (!settings.lunchIncluded) {
        workMinutes -= settings.lunchDuration;
    }

    return workMinutes * 60; // 转换为秒
}

// 计算每秒薪资
function getPerSecondSalary(settings) {
    const monthWorkDays = getMonthWorkDays(settings.isDoubleRest);
    const dailyWorkSeconds = getDailyWorkSeconds(settings);

    if (dailyWorkSeconds <= 0) return 0;

    // 每秒薪资 = 月薪 / 月工作日 / 日工作时长
    return settings.monthlySalary / monthWorkDays / dailyWorkSeconds;
}

// 计算今日已工作秒数
function getTodayWorkedSeconds(settings) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const workStartMinutes = timeToMinutes(settings.workStartTime);
    const workEndMinutes = timeToMinutes(settings.workEndTime);
    const lunchStartMinutes = timeToMinutes(settings.lunchStartTime);
    const lunchEndMinutes = timeToMinutes(settings.lunchEndTime);

    // 如果还没到上班时间
    if (currentMinutes < workStartMinutes) {
        return 0;
    }

    // 如果已经下班
    if (currentMinutes >= workEndMinutes) {
        return getDailyWorkSeconds(settings);
    }

    // 计算已工作分钟数
    let workedMinutes = currentMinutes - workStartMinutes;

    // 如果午休不计入薪资，减去午休时间
    if (!settings.lunchIncluded) {
        // 如果当前在午休时间内
        if (currentMinutes >= lunchStartMinutes && currentMinutes < lunchEndMinutes) {
            workedMinutes = lunchStartMinutes - workStartMinutes;
        }
        // 如果当前在午休结束后
        else if (currentMinutes >= lunchEndMinutes) {
            workedMinutes = workedMinutes - settings.lunchDuration;
        }
    }

    return Math.max(0, workedMinutes * 60);
}

// 判断是否是工作日（简化版：跳过周末）
function isWorkDay(settings) {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=周日, 6=周六

    // 如果跳过周末
    if (settings.skipWeekend) {
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return false;
        }
    }

    // 跳过节假日暂时不实现（需要网络日历）
    // if (settings.skipHoliday) { ... }

    return true;
}

// 计算距离下班的倒计时
function getCountdown(settings) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentSeconds = now.getSeconds();
    const workEndMinutes = timeToMinutes(settings.workEndTime);

    // 如果已经下班
    if (currentMinutes >= workEndMinutes) {
        return { hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    // 计算剩余秒数
    const remainingMinutes = workEndMinutes - currentMinutes;
    const remainingSeconds = remainingMinutes * 60 - currentSeconds;

    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    return { hours, minutes, seconds, total: remainingSeconds };
}

// 计算距离发薪日的天数
function getPaydayCountdown(payDay) {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 本月发薪日
    let paydayDate = new Date(currentYear, currentMonth, payDay);

    // 如果本月发薪日已过，计算下个月的
    if (currentDay >= payDay) {
        paydayDate = new Date(currentYear, currentMonth + 1, payDay);
    }

    // 计算天数差
    const diffTime = paydayDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

// 计算今日进度百分比
function getTodayProgress(settings) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const workStartMinutes = timeToMinutes(settings.workStartTime);
    const workEndMinutes = timeToMinutes(settings.workEndTime);

    // 如果还没到上班时间
    if (currentMinutes < workStartMinutes) {
        return 0;
    }

    // 如果已经下班
    if (currentMinutes >= workEndMinutes) {
        return 100;
    }

    // 计算进度
    const totalWorkMinutes = workEndMinutes - workStartMinutes;
    const workedMinutes = currentMinutes - workStartMinutes;

    return Math.min(100, Math.round((workedMinutes / totalWorkMinutes) * 100));
}

// ============ 显示更新 ============

// 更新今日薪资显示
function updateTodayDisplay() {
    const settings = getCurrentSettings();
    const isWork = isWorkDay(settings);

    // 如果不是工作日，显示休息状态
    if (!isWork) {
        elements.statusBadge.textContent = '  休息日';
        elements.todayAmount.textContent = '¥0.00';
        elements.progressBar.style.width = '0%';
        elements.progressPercent.textContent = '0%';
        elements.countdown.textContent = '休息日';
        return;
    }

    elements.statusBadge.textContent = '  搬砖中';

    // 计算今日已赚
    const perSecond = getPerSecondSalary(settings);
    const workedSeconds = getTodayWorkedSeconds(settings);
    const todayEarned = perSecond * workedSeconds;

    // 更新今日已赚金额
    elements.todayAmount.textContent = `¥${todayEarned.toFixed(2)}`;

    // 更新进度条
    const progress = getTodayProgress(settings);
    elements.progressBar.style.width = `${progress}%`;
    elements.progressPercent.textContent = `${progress}%`;

    // 更新倒计时
    const countdown = getCountdown(settings);
    if (countdown.total > 0) {
        elements.countdown.textContent =
            `${String(countdown.hours).padStart(2, '0')}:${String(countdown.minutes).padStart(2, '0')}:${String(countdown.seconds).padStart(2, '0')}`;
    } else {
        elements.countdown.textContent = '已下班';
    }

    // 更新统计卡片
    const monthWorkDays = getMonthWorkDays(settings.isDoubleRest);
    const monthlyEarned = todayEarned; // 简化：只计算今日
    const hourlySalary = perSecond * 3600;

    elements.monthEarned.textContent = `¥${monthlyEarned.toFixed(0)}`;
    elements.hourlyRate.textContent = `¥${hourlySalary.toFixed(1)}/h`;
    elements.perSecond.textContent = `¥${perSecond.toFixed(4)}`;

    // 更新发薪日倒计时
    const paydayDays = getPaydayCountdown(settings.payDay);
    elements.paydayCountdown.textContent = `${paydayDays} 天`;
}

// 启动定时更新
function startAutoUpdate() {
    // 立即更新一次
    updateTodayDisplay();

    // 每秒更新
    updateTimer = setInterval(updateTodayDisplay, 1000);
}

// 停止定时更新
function stopAutoUpdate() {
    if (updateTimer) {
        clearInterval(updateTimer);
        updateTimer = null;
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

    // 监听设置变更，实时更新显示
    const inputs = [
        elements.monthlySalary,
        elements.workStartTime,
        elements.workEndTime,
        elements.lunchStartTime,
        elements.lunchEndTime,
        elements.lunchDuration,
        elements.lunchIncluded,
        elements.isDoubleRest,
        elements.skipHoliday,
        elements.skipWeekend,
        elements.payDay
    ];

    inputs.forEach(input => {
        const eventType = input.type === 'checkbox' || input.type === 'number' ? 'change' : 'change';
        input.addEventListener(eventType, updateTodayDisplay);
    });

    // 启动自动更新
    startAutoUpdate();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
