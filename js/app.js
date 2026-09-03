// 摸鱼薪资计算器 - 主逻辑

// ============ 日历数据管理（100年） ============

// localStorage 键名
const CALENDAR_DATA_KEY = 'touchFishCalendarData';
const CALENDAR_YEARS_KEY = 'touchFishCalendarYears'; // 记录存储的年份范围

// 生成单年的日历数据（每天是星期几）
function generateYearCalendar(year) {
    const days = [];
    const startDate = new Date(year, 0, 1); // 1月1日
    const endDate = new Date(year, 11, 31); // 12月31日

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        days.push({
            date: formatDate(new Date(date)),
            weekday: date.getDay() // 0=周日, 1=周一, ..., 6=周六
        });
    }

    return { year, days };
}

// 生成100年日历数据并存储到 localStorage
function generateAndSaveCalendarData() {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear;
    const endYear = currentYear + 99; // 100年

    console.log(`生成 ${startYear}-${endYear} 年日历数据...`);

    const allCalendar = {};
    for (let year = startYear; year <= endYear; year++) {
        allCalendar[year] = generateYearCalendar(year);
    }

    // 存储日历数据
    localStorage.setItem(CALENDAR_DATA_KEY, JSON.stringify(allCalendar));
    // 存储年份范围
    localStorage.setItem(CALENDAR_YEARS_KEY, JSON.stringify({ start: startYear, end: endYear }));

    console.log('日历数据生成完成');
}

// 从 localStorage 获取日历数据
function getCalendarData() {
    const saved = localStorage.getItem(CALENDAR_DATA_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.warn('读取日历数据失败:', e);
            return null;
        }
    }
    return null;
}

// 获取某天是星期几（从本地日历数据）
function getWeekdayFromDate(date) {
    const calendar = getCalendarData();
    if (!calendar) return date.getDay(); // 如果没有缓存，直接计算

    const year = date.getFullYear();
    const dateStr = formatDate(date);

    const yearData = calendar[year];
    if (!yearData || !yearData.days) return date.getDay();

    const dayInfo = yearData.days.find(d => d.date === dateStr);
    return dayInfo ? dayInfo.weekday : date.getDay();
}

// 检查日历数据是否需要初始化（不存在或年份范围不对）
function needInitCalendar() {
    const saved = localStorage.getItem(CALENDAR_YEARS_KEY);
    if (!saved) return true;

    try {
        const { start, end } = JSON.parse(saved);
        const currentYear = new Date().getFullYear();
        // 检查是否覆盖当前年份到未来100年
        return start > currentYear || end < currentYear + 99;
    } catch (e) {
        return true;
    }
}

// 初始化日历数据
function initCalendarData() {
    if (needInitCalendar()) {
        generateAndSaveCalendarData();
    }
}

// ============ 节假日数据管理（调休） ============

// localStorage 键名
const HOLIDAY_DATA_KEY = 'touchFishHolidayData';
const HOLIDAY_UPDATE_TIME_KEY = 'touchFishHolidayUpdateTime';

// 获取日期字符串 (YYYY-MM-DD)
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 从 localStorage 获取所有节假日数据
function getAllHolidayData() {
    const saved = localStorage.getItem(HOLIDAY_DATA_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.warn('读取节假日数据失败:', e);
            return {};
        }
    }
    return {};
}

// 保存节假日数据到 localStorage
function saveHolidayData(year, data) {
    const allData = getAllHolidayData();
    allData[year] = data;
    localStorage.setItem(HOLIDAY_DATA_KEY, JSON.stringify(allData));
}

// 获取上次更新明年数据的时间
function getLastUpdateTime() {
    const time = localStorage.getItem(HOLIDAY_UPDATE_TIME_KEY);
    return time ? parseInt(time) : null;
}

// 保存上次更新时间
function saveUpdateTime() {
    localStorage.setItem(HOLIDAY_UPDATE_TIME_KEY, Date.now().toString());
}

// 检查是否需要更新明年数据（超过5天）
function needUpdateNextYear() {
    const lastTime = getLastUpdateTime();
    if (!lastTime) return true;
    const daysSinceUpdate = (Date.now() - lastTime) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate >= 5;
}

// 从远程获取节假日数据
async function fetchHolidayData(year) {
    try {
        const response = await fetch(`https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`);
        if (response.ok) {
            const data = await response.json();
            // 保存到 localStorage
            saveHolidayData(year, data);
            return data;
        }
        return null;
    } catch (e) {
        console.warn(`获取${year}年节假日数据失败:`, e);
        return null;
    }
}

// 初始化节假日数据
async function initHolidayData() {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const allData = getAllHolidayData();

    // 如果当前年份数据不存在，从远程获取
    if (!allData[currentYear]) {
        console.log(`获取${currentYear}年节假日数据...`);
        await fetchHolidayData(currentYear);
    }

    // 检查是否需要更新明年数据（超过5天）
    if (needUpdateNextYear()) {
        console.log('尝试获取明年节假日数据...');
        await fetchHolidayData(nextYear);
        saveUpdateTime();
    }
}

// 获取某年节假日数据（从 localStorage）
function getHolidayYearData(year) {
    const allData = getAllHolidayData();
    return allData[year] || null;
}

// 检查某一天是否是休息日（节假日）
function isHolidayOffDay(date) {
    const year = date.getFullYear();
    const dateStr = formatDate(date);

    const yearData = getHolidayYearData(year);
    if (!yearData || !yearData.days) return null;

    const dayInfo = yearData.days.find(d => d.date === dateStr);
    // isOffDay=true 表示休息日（节假日），isOffDay=false 表示调休上班日
    return dayInfo ? dayInfo.isOffDay : null; // null 表示不是节假日数据中的日期
}

// 检查某一天是否是调休上班日（周末但需要上班）
function isHolidayWorkDay(date) {
    const year = date.getFullYear();
    const dateStr = formatDate(date);

    const yearData = getHolidayYearData(year);
    if (!yearData || !yearData.days) return false;

    const dayInfo = yearData.days.find(d => d.date === dateStr);
    // isOffDay=false 表示调休上班日
    return dayInfo ? !dayInfo.isOffDay : false;
}

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
    perMinute: document.getElementById('perMinute'),
    paydayCountdown: document.getElementById('paydayCountdown'),
    paydayHint: document.getElementById('paydayHint'),
    // 日期信息
    dateText: document.getElementById('dateText'),
    yearWorkDay: document.getElementById('yearWorkDay'),
    monthWorkDay: document.getElementById('monthWorkDay')
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

// 星期几的中文名称
const weekdayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// 获取今天的日期信息
function getTodayDateInfo() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const weekday = getWeekdayFromDate(now);

    return {
        text: `${year}年${month}月${day}日 ${weekdayNames[weekday]}`,
        weekday: weekday
    };
}

// 计算今年已过的工作日天数（不包括今天）
function getYearPassedWorkDays(settings) {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentDay = now.getDate();

    let workDays = 0;

    // 遍历今年1月到当前月的前一天
    for (let month = 0; month < currentMonth; month++) {
        const daysInMonth = new Date(now.getFullYear(), month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(now.getFullYear(), month, day);
            if (isWorkDayForDate(date, settings)) {
                workDays++;
            }
        }
    }

    // 遍历当前月1号到昨天
    for (let day = 1; day < currentDay; day++) {
        const date = new Date(now.getFullYear(), now.getMonth(), day);
        if (isWorkDayForDate(date, settings)) {
            workDays++;
        }
    }

    return workDays;
}

// 计算本月已过的工作日天数（不包括今天）
function getMonthPassedWorkDays(settings) {
    const now = new Date();
    const currentDay = now.getDate();

    let workDays = 0;

    // 遍历本月1号到昨天
    for (let day = 1; day < currentDay; day++) {
        const date = new Date(now.getFullYear(), now.getMonth(), day);
        if (isWorkDayForDate(date, settings)) {
            workDays++;
        }
    }

    return workDays;
}

// 判断指定日期是否是工作日
function isWorkDayForDate(date, settings) {
    const dayOfWeek = getWeekdayFromDate(date);

    // 检查是否是调休上班日（周末但需要上班）
    if (isHolidayWorkDay(date)) {
        return true;
    }

    // 检查是否是节假日休息日
    const holidayOff = isHolidayOffDay(date);
    if (holidayOff === true && settings.skipHoliday) {
        return false;
    }

    // 检查是否是周末
    if (settings.skipWeekend) {
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return false;
        }
    }

    return true;
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

// 判断是否是工作日
function isWorkDay(settings) {
    const now = new Date();
    const dayOfWeek = getWeekdayFromDate(now); // 从本地日历获取星期几

    // 检查是否是调休上班日（周末但需要上班）
    const holidayWorkDay = isHolidayWorkDay(now);
    if (holidayWorkDay) {
        return true; // 调休上班日，视为工作日
    }

    // 检查是否是节假日休息日
    const holidayOff = isHolidayOffDay(now);
    if (holidayOff === true && settings.skipHoliday) {
        return false; // 节假日休息日
    }

    // 检查是否是周末
    if (settings.skipWeekend) {
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return false;
        }
    }

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

// 计算发薪日信息（天数 + 周几提示）
function getPaydayInfo(payDay) {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 本月发薪日
    let paydayDate = new Date(currentYear, currentMonth, payDay);
    let isThisMonth = true;

    // 如果本月发薪日已过，计算下个月的
    if (currentDay >= payDay) {
        paydayDate = new Date(currentYear, currentMonth + 1, payDay);
        isThisMonth = false;
    }

    // 计算天数差
    const diffTime = paydayDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 获取发薪日是周几
    const weekday = getWeekdayFromDate(paydayDate);
    const weekdayStr = weekdayNames[weekday];
    const monthStr = isThisMonth ? '本月' : '下月';

    // 构建提示信息
    let hint = `${monthStr}发薪日：${paydayDate.getMonth() + 1}月${paydayDate.getDate()}日 ${weekdayStr}`;

    // 如果是周末或调休，额外提示
    if (weekday === 0 || weekday === 6) {
        // 检查是否是调休上班日
        if (isHolidayWorkDay(paydayDate)) {
            hint += '（调休上班，正常发薪）';
        } else {
            hint += '（周末，可能顺延）';
        }
    }

    return { days: diffDays, hint };
}

// 计算今日进度百分比（精确到秒）
function getTodayProgress(settings) {
    const now = new Date();
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const workStartSeconds = timeToMinutes(settings.workStartTime) * 60;
    const workEndSeconds = timeToMinutes(settings.workEndTime) * 60;

    // 如果还没到上班时间
    if (currentSeconds < workStartSeconds) {
        return 0;
    }

    // 如果已经下班
    if (currentSeconds >= workEndSeconds) {
        return 100;
    }

    // 计算进度（精确到秒）
    const totalWorkSeconds = workEndSeconds - workStartSeconds;
    const workedSeconds = currentSeconds - workStartSeconds;

    return Math.min(100, (workedSeconds / totalWorkSeconds) * 100);
}

// 计算本月已赚薪资
function getMonthEarned(settings) {
    const perSecond = getPerSecondSalary(settings);
    const dailyWorkSeconds = getDailyWorkSeconds(settings);

    // 本月已过工作日的薪资
    const passedWorkDays = getMonthPassedWorkDays(settings);
    const passedDaysSalary = passedWorkDays * perSecond * dailyWorkSeconds;

    // 今日已赚
    const workedSeconds = getTodayWorkedSeconds(settings);
    const todayEarned = perSecond * workedSeconds;

    return passedDaysSalary + todayEarned;
}

// ============ 显示更新 ============

// 更新今日薪资显示
function updateTodayDisplay() {
    const settings = getCurrentSettings();
    const isWork = isWorkDay(settings);

    // 更新日期信息
    const dateInfo = getTodayDateInfo();
    elements.dateText.textContent = dateInfo.text;

    // 计算工作日（包括今天）
    const yearWorkDays = getYearPassedWorkDays(settings) + (isWork ? 1 : 0);
    const monthWorkDays = getMonthPassedWorkDays(settings) + (isWork ? 1 : 0);
    elements.yearWorkDay.textContent = yearWorkDays;
    elements.monthWorkDay.textContent = monthWorkDays;

    // 如果不是工作日，显示休息状态
    if (!isWork) {
        elements.statusBadge.textContent = '  休息日';
        elements.todayAmount.textContent = '¥0.00 / ¥0.00';
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
    const dailyWorkSeconds = getDailyWorkSeconds(settings);
    const dailySalary = perSecond * dailyWorkSeconds;

    // 更新今日已赚金额（已赚/每日薪资）
    elements.todayAmount.textContent = `¥${todayEarned.toFixed(2)} / ¥${dailySalary.toFixed(2)}`;

    // 更新进度条（三位小数）
    const progress = getTodayProgress(settings);
    elements.progressBar.style.width = `${progress}%`;
    elements.progressPercent.textContent = `${progress.toFixed(3)}%`;

    // 更新倒计时（实时跳动）
    const countdown = getCountdown(settings);
    if (countdown.total > 0) {
        elements.countdown.textContent =
            `${String(countdown.hours).padStart(2, '0')}:${String(countdown.minutes).padStart(2, '0')}:${String(countdown.seconds).padStart(2, '0')}`;
    } else {
        elements.countdown.textContent = '已下班';
    }

    // 更新统计卡片
    const monthlyEarned = getMonthEarned(settings);
    const hourlySalary = perSecond * 3600;
    const perMinuteSalary = perSecond * 60;

    elements.monthEarned.textContent = `¥${monthlyEarned.toFixed(2)}`;
    elements.hourlyRate.textContent = `¥${hourlySalary.toFixed(2)}/h`;
    elements.perMinute.textContent = `¥${perMinuteSalary.toFixed(2)}`;

    // 更新发薪日倒计时和提示
    const paydayInfo = getPaydayInfo(settings.payDay);
    elements.paydayCountdown.textContent = `${paydayInfo.days} 天`;
    elements.paydayHint.textContent = paydayInfo.hint;
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
async function init() {
    // 初始化日历数据（100年，同步）
    initCalendarData();

    // 初始化节假日数据（异步）
    await initHolidayData();

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
