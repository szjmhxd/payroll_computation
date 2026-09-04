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

// 生成日历数据并存储到 localStorage（只生成10年）
function generateAndSaveCalendarData() {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear;
    const endYear = currentYear + 9; // 10年

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
        // 检查是否覆盖当前年份到未来10年
        return start > currentYear || end < currentYear + 9;
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
    paydayWorkdays: document.getElementById('paydayWorkdays'),
    paydayHint: document.getElementById('paydayHint'),
    // 日期信息
    dateText: document.getElementById('dateText'),
    yearWorkDay: document.getElementById('yearWorkDay'),
    yearWorkDayTotal: document.getElementById('yearWorkDayTotal'),
    monthWorkDay: document.getElementById('monthWorkDay'),
    monthWorkDayTotal: document.getElementById('monthWorkDayTotal'),
    // 赚钱速度换算
    coffeeWorkday: document.getElementById('coffeeWorkday'),
    coffeeCalendar: document.getElementById('coffeeCalendar'),
    lunchWorkday: document.getElementById('lunchWorkday'),
    lunchCalendar: document.getElementById('lunchCalendar'),
    phoneWorkday: document.getElementById('phoneWorkday'),
    phoneCalendar: document.getElementById('phoneCalendar'),
    carWorkday: document.getElementById('carWorkday'),
    carCalendar: document.getElementById('carCalendar'),
    // 下班/休息日展示
    todayWorking: document.getElementById('todayWorking'),
    todayDone: document.getElementById('todayDone'),
    todayOff: document.getElementById('todayOff'),
    doneAmount: document.getElementById('doneAmount'),
    offAmount: document.getElementById('offAmount')
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

// 初始化 Layui laydate 时间选择器
// laydate 支持移动端滚轮选择，UI 更美观
function initTimePickers() {
    layui.use('laydate', function () {
        var laydate = layui.laydate;
        var timeIds = ['workStartTime', 'workEndTime', 'lunchStartTime', 'lunchEndTime'];

        timeIds.forEach(function (id) {
            laydate.render({
                elem: '#' + id,         // 绑定输入框
                type: 'time',           // 仅时间选择（时:分）
                format: 'HH:mm',       // 24小时制 格式
                done: function (value) {
                    // 用户选择时间后同步到 localStorage
                    var settings = getCurrentSettings();
                    settings[id] = value;
                    localStorage.setItem('touchFishSettings', JSON.stringify(settings));
                    updateAllDisplays();
                }
            });
        });
    });
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

// 午休时间三字段联动（保存时才计算）
function setupLunchTimeLinkage() {
    // 不再实时监听，点击保存时才计算联动
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
    
    // 保存后立即更新显示
    updateTodayDisplay();
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
    // 从localStorage读取，不从输入框读取
    const saved = localStorage.getItem('touchFishPaySettings');
    if (saved) {
        return JSON.parse(saved);
    }
    // 如果没有保存过，返回默认值
    return { ...defaultSettings };
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

// 计算今年总工作日天数
function getYearTotalWorkDays(settings) {
    const now = new Date();
    const year = now.getFullYear();
    const lastDay = new Date(year, 11, 31); // 12月31日

    let workDays = 0;
    const startDate = new Date(year, 0, 1); // 1月1日

    for (let d = new Date(startDate); d <= lastDay; d.setDate(d.getDate() + 1)) {
        if (isWorkDayForDate(d, settings)) {
            workDays++;
        }
    }

    return workDays;
}

// 计算本月总工作日天数
function getMonthTotalWorkDays(settings) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0); // 本月最后一天

    let workDays = 0;
    const startDate = new Date(year, month, 1); // 本月1号

    for (let d = new Date(startDate); d <= lastDay; d.setDate(d.getDate() + 1)) {
        if (isWorkDayForDate(d, settings)) {
            workDays++;
        }
    }

    return workDays;
}

// 计算两个日期之间的工作日天数（包括起始日和结束日）
function getWorkDaysBetween(startDate, endDate, settings) {
    let workDays = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
        if (isWorkDayForDate(current, settings)) {
            workDays++;
        }
        current.setDate(current.getDate() + 1);
    }

    return workDays;
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
    // 使用秒级精度计算
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const workStartSeconds = timeToMinutes(settings.workStartTime) * 60;
    const workEndSeconds = timeToMinutes(settings.workEndTime) * 60;
    const lunchStartSeconds = timeToMinutes(settings.lunchStartTime) * 60;
    const lunchEndSeconds = timeToMinutes(settings.lunchEndTime) * 60;

    // 如果还没到上班时间
    if (currentSeconds < workStartSeconds) {
        return 0;
    }

    // 如果已经下班
    if (currentSeconds >= workEndSeconds) {
        return getDailyWorkSeconds(settings);
    }

    // 计算已工作秒数
    let workedSeconds = currentSeconds - workStartSeconds;

    // 如果午休不计入薪资，减去午休时间
    if (!settings.lunchIncluded) {
        // 如果当前在午休时间内
        if (currentSeconds >= lunchStartSeconds && currentSeconds < lunchEndSeconds) {
            workedSeconds = lunchStartSeconds - workStartSeconds;
        }
        // 如果当前在午休结束后
        else if (currentSeconds >= lunchEndSeconds) {
            workedSeconds = currentSeconds - workStartSeconds - (lunchEndSeconds - lunchStartSeconds);
        }
    }

    return workedSeconds;
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

// 计算发薪日信息（自然日 + 工作日 + 周几提示）
function getPaydayInfo(payDay) {
    const settings = getCurrentSettings();
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

    // 计算自然日天数差
    const diffTime = paydayDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 计算工作日天数
    const workDays = getWorkDaysBetween(now, paydayDate, settings);

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

    return { days: diffDays, workDays, hint };
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
    const yearWorkDaysTotal = getYearTotalWorkDays(settings);
    const monthWorkDays = getMonthPassedWorkDays(settings) + (isWork ? 1 : 0);
    const monthWorkDaysTotal = getMonthTotalWorkDays(settings);

    elements.yearWorkDay.textContent = yearWorkDays;
    elements.yearWorkDayTotal.textContent = yearWorkDaysTotal;
    elements.monthWorkDay.textContent = monthWorkDays;
    elements.monthWorkDayTotal.textContent = monthWorkDaysTotal;

    // 判断当前是否已过下班时间（仅在工作日有效）
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const workEndMinutes = timeToMinutes(settings.workEndTime);
    const isPastWork = isWork && currentMinutes >= workEndMinutes;

    // 切换三套展示区块的显示/隐藏
    elements.todayWorking.style.display = (!isWork || isPastWork) ? 'none' : '';
    elements.todayDone.style.display = isPastWork ? '' : 'none';
    elements.todayOff.style.display = !isWork && !isPastWork ? '' : 'none';

    // —— 休息日 ——
    if (!isWork) {
        elements.statusBadge.textContent = '  休息日';
        elements.countdown.textContent = '休息日';
        elements.offAmount.textContent = '¥0.00'; // 休息日无进账
        // 统计卡片仍显示本月已赚等数据
        const perSecond = getPerSecondSalary(settings);
        elements.monthEarned.textContent = `¥${getMonthEarned(settings).toFixed(2)}`;
        elements.hourlyRate.textContent = `¥${(perSecond * 3600).toFixed(2)}/h`;
        elements.perMinute.textContent = `¥${(perSecond * 60).toFixed(2)}`;
        const paydayInfo = getPaydayInfo(settings.payDay);
        elements.paydayCountdown.textContent = `${paydayInfo.days} 自然日`;
        elements.paydayWorkdays.textContent = `${paydayInfo.workDays} 工作日`;
        elements.paydayHint.textContent = paydayInfo.hint;
        updateSpeedConversion();
        return;
    }

    // —— 下班后（工作日但已过下班时间）——
    const perSecond = getPerSecondSalary(settings);
    const workedSeconds = getTodayWorkedSeconds(settings);
    const todayEarned = perSecond * workedSeconds;

    if (isPastWork) {
        elements.statusBadge.textContent = '  今日搬砖结束';
        elements.doneAmount.textContent = `¥${todayEarned.toFixed(2)}`;
        // 统计卡片仍正常更新
        const dailyWorkSeconds = getDailyWorkSeconds(settings);
        const dailySalary = perSecond * dailyWorkSeconds;
        const monthlyEarned = getMonthEarned(settings);
        elements.monthEarned.textContent = `¥${monthlyEarned.toFixed(2)}`;
        elements.hourlyRate.textContent = `¥${(perSecond * 3600).toFixed(2)}/h`;
        elements.perMinute.textContent = `¥${(perSecond * 60).toFixed(2)}`;
        const paydayInfo = getPaydayInfo(settings.payDay);
        elements.paydayCountdown.textContent = `${paydayInfo.days} 自然日`;
        elements.paydayWorkdays.textContent = `${paydayInfo.workDays} 工作日`;
        elements.paydayHint.textContent = paydayInfo.hint;
        updateSpeedConversion();
        return;
    }

    // —— 工作中 ——
    elements.statusBadge.textContent = '  搬砖中';

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
    elements.paydayCountdown.textContent = `${paydayInfo.days} 自然日`;
    elements.paydayWorkdays.textContent = `${paydayInfo.workDays} 工作日`;
    elements.paydayHint.textContent = paydayInfo.hint;

    // 更新赚钱速度换算
    updateSpeedConversion();
}

// ============ 赚钱速度换算（工作日耗时 / 自然日耗时） ============
// 单位共有 年/月/日/时/分 五个，最多显示 3 个单位（不足则可少于 3 个）
// 只有最小单位允许出现小数，且最多保留一位小数（四舍五入）

// —— 工作日耗时 ——
// 单位：年/月/日/时/分 共五个，最多显示 3 个（不足则少显示）
// 只有最小单位允许含小数，且最多保留一位小数（四舍五入）
// amount: 商品金额；dailySalary: 每日薪资；dailyWorkMinutes: 每日工作分钟数；monthWorkDays: 月工作天数
function formatWorkTime(amount, dailySalary, dailyWorkMinutes, monthWorkDays) {
    if (amount <= 0 || dailySalary <= 0 || dailyWorkMinutes <= 0 || monthWorkDays <= 0) return '0分钟';

    const perMinute = dailySalary / dailyWorkMinutes; // 每分钟薪资
    const totalMinutes = amount / perMinute;          // 需要工作的总分钟数

    const dayMinutes = dailyWorkMinutes;              // 每日工作分钟数
    const monthMinutes = monthWorkDays * dayMinutes;  // 每月工作分钟数
    const yearMinutes = monthMinutes * 12;            // 每年工作分钟数

    // 依次拆出 年 -> 月 -> 日 -> 时 -> 分
    let rem = totalMinutes;
    const years = Math.floor(rem / yearMinutes);
    rem -= years * yearMinutes;

    const months = Math.floor(rem / monthMinutes);
    rem -= months * monthMinutes;

    const days = Math.floor(rem / dayMinutes);
    rem -= days * dayMinutes;

    const hours = Math.floor(rem / 60);
    let minutes = rem - hours * 60;
    minutes = Math.round(minutes * 10) / 10; // 最小单位保留一位小数

    const parts = [];
    if (years > 0) parts.push(`${years}年`);
    if (months > 0) parts.push(`${months}月`);
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes >= 0.1) parts.push(`${minutes % 1 === 0 ? Math.round(minutes) : minutes}分钟`);
    if (parts.length === 0) {
        const m = Math.max(0.1, Math.round(totalMinutes * 10) / 10);
        parts.push(`${m % 1 === 0 ? Math.round(m) : m}分钟`);
    }
    return parts.slice(0, 3).join('');
}

// —— 自然日耗时 ——
// 单位：日/时/分 三个，最多显示 3 个（不足则少显示）
// 只有最小单位允许含小数，且最多保留一位小数（四舍五入）
// 按真实日历（含周末与节假日）推算：金额先按整年 / 整月薪资扣除，
// 剩余部分换算成需要的工作日数（可含小数），从参考日期起逐自然日累积，
// 最后一个不足一天的部分工作日，换算成 时 / 分。
function formatNaturalDay(amount, settings) {
    if (amount <= 0) return '今天';

    const monthWorkDays = getMonthWorkDays(settings.isDoubleRest);
    const dailySalary = settings.monthlySalary / monthWorkDays;
    if (dailySalary <= 0) return '0天';

    // 金额不足一天薪资：当天即可赚到，按实际工作时长展示（不足1小时只显示分钟，超过1小时显示 时+分）
    // 与工作日耗时口径一致，直接复用 formatWorkTime（此区间只会产生 时/分，不会出现 天/月/年）
    if (amount < dailySalary) {
        const dailyWorkMinutes = getDailyWorkSeconds(settings) / 60;
        return formatWorkTime(amount, dailySalary, dailyWorkMinutes, monthWorkDays);
    }

    const monthlySalary = settings.monthlySalary;
    const yearlySalary = monthlySalary * 12;

    // 参考日期：从今天起，先加上完整年数，再加上完整月数
    const refDate = new Date();
    let years = Math.floor(amount / yearlySalary);
    let rem = amount - years * yearlySalary;
    if (years > 0) refDate.setFullYear(refDate.getFullYear() + years);

    let months = Math.floor(rem / monthlySalary);
    rem = rem - months * monthlySalary;
    if (months > 0) refDate.setMonth(refDate.getMonth() + months);

    // 剩余金额需要的工作日数（整数部分 = 完整工作日，小数部分 = 最后一个工作日只做一部分）
    const workDaysNeeded = rem / dailySalary;
    const fullWorkDays = Math.floor(workDaysNeeded);
    const partialFraction = workDaysNeeded - fullWorkDays;

    // 从参考日期开始，逐自然日判断是否工作日并累计，积满整数个完整工作日
    let accumulated = 0;
    let calendarDays = 0;
    const maxDays = 365 * 30 + 1;
    while (accumulated < fullWorkDays && calendarDays < maxDays) {
        const checkDate = new Date(refDate);
        checkDate.setDate(checkDate.getDate() + calendarDays);
        if (isWorkDayForDate(checkDate, settings)) {
            accumulated += 1; // 每个完整工作日计 1
        }
        calendarDays++;
    }

    // 目标自然日 = 参考日期 + 经过的日历天数（即完成工作所需的那一天）
    const targetDate = new Date(refDate);
    targetDate.setDate(targetDate.getDate() + calendarDays);

    // 从今天（零点）到目标日（零点）的自然日跨度
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetMidnight = new Date(targetDate);
    targetMidnight.setHours(0, 0, 0, 0);
    const totalDays = Math.round((targetMidnight - today) / (1000 * 60 * 60 * 24));

    if (totalDays <= 0) return '今天';

    // 最后一个部分工作日不足一天的工作时长（分钟）
    const dailyWorkMinutes = getDailyWorkSeconds(settings) / 60;
    const partialMinutes = partialFraction * dailyWorkMinutes;
    const hours = Math.floor(partialMinutes / 60);
    let minutes = partialMinutes - hours * 60;
    minutes = Math.round(minutes * 10) / 10; // 最小单位保留一位小数

    const parts = [];
    if (totalDays > 0) parts.push(`${totalDays}天`);
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes >= 0.1) parts.push(`${minutes % 1 === 0 ? Math.round(minutes) : minutes}分钟`);
    if (parts.length === 0) return '今天';
    return parts.slice(0, 3).join('');
}

// 更新赚钱速度换算（内部使用设置数据计算，避免依赖输入框）
function updateSpeedConversion() {
    const settings = getCurrentSettings();
    const monthWorkDays = getMonthWorkDays(settings.isDoubleRest);
    const dailyWorkMinutes = getDailyWorkSeconds(settings) / 60;

    if (settings.monthlySalary <= 0 || monthWorkDays <= 0 || dailyWorkMinutes <= 0) {
        setSpeedDisplay('--', '--', '--', '--', '--', '--', '--', '--');
        return;
    }

    const dailySalary = settings.monthlySalary / monthWorkDays;

    setSpeedDisplay(
        // 咖啡：工作日耗时 和 自然日耗时
        formatWorkTime(9.9, dailySalary, dailyWorkMinutes, monthWorkDays),
        formatNaturalDay(9.9, settings),
        // 盒饭：工作日耗时 和 自然日耗时
        formatWorkTime(15, dailySalary, dailyWorkMinutes, monthWorkDays),
        formatNaturalDay(15, settings),
        // 手机：工作日耗时 和 自然日耗时
        formatWorkTime(6000, dailySalary, dailyWorkMinutes, monthWorkDays),
        formatNaturalDay(6000, settings),
        // 车子：工作日耗时 和 自然日耗时
        formatWorkTime(299000, dailySalary, dailyWorkMinutes, monthWorkDays),
        formatNaturalDay(299000, settings)
    );
}

// 设置赚钱速度显示（工作日和自然日）
function setSpeedDisplay(coffeeWorkday, coffeeCalendar, lunchWorkday, lunchCalendar, 
                         phoneWorkday, phoneCalendar, carWorkday, carCalendar) {
    elements.coffeeWorkday.textContent = coffeeWorkday;
    elements.coffeeCalendar.textContent = coffeeCalendar;
    elements.lunchWorkday.textContent = lunchWorkday;
    elements.lunchCalendar.textContent = lunchCalendar;
    elements.phoneWorkday.textContent = phoneWorkday;
    elements.phoneCalendar.textContent = phoneCalendar;
    elements.carWorkday.textContent = carWorkday;
    elements.carCalendar.textContent = carCalendar;
}

// 启动自动更新（从localStorage读取数据，实时更新薪资显示）
function startAutoUpdate() {
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
    console.log('=== 开始初始化 ===');
    const totalStart = performance.now();

    // 初始化日历数据
    let start = performance.now();
    initCalendarData();
    console.log(`日历数据初始化: ${(performance.now() - start).toFixed(2)}ms`);

    // 初始化节假日数据（异步）
    start = performance.now();
    await initHolidayData();
    console.log(`节假日数据初始化: ${(performance.now() - start).toFixed(2)}ms`);

    start = performance.now();
    initTimePickers();
    console.log(`时间选择器初始化: ${(performance.now() - start).toFixed(2)}ms`);

    start = performance.now();
    setupLunchTimeLinkage();
    console.log(`午休联动设置: ${(performance.now() - start).toFixed(2)}ms`);

    start = performance.now();
    loadSettings();
    console.log(`加载设置: ${(performance.now() - start).toFixed(2)}ms`);

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

    // 不再实时监听，点击保存时才更新

    // 启动自动更新
    startAutoUpdate();

    // 处理图标加载失败，显示备用emoji
    document.querySelectorAll('.speed-icon img').forEach(img => {
        img.onerror = function() {
            this.classList.add('load-failed');
            const fallback = this.parentElement.getAttribute('data-fallback');
            if (fallback) {
                this.parentElement.innerHTML = fallback;
            }
        };
    });

    console.log(`=== 初始化完成，总耗时: ${(performance.now() - totalStart).toFixed(2)}ms ===`);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

/* ============================================================
 * 赚钱速度换算算法说明
 * ------------------------------------------------------------
 * 基本概念
 *   - dailySalary  = 月薪 / 月工作日数           （每日薪资）
 *   - perMinute    = dailySalary / 每日工作分钟   （每分钟薪资）
 *   - monthWorkDays：双休按 21.75 天，单休按 25.75 天（简化近似）
 *
 * 单位规则（两个时间类型均适用）
 *   - 最多显示 3 个单位（不足则少显示）
 *   - 只有最小单位允许含小数，且最多保留一位小数（四舍五入）
 *
 * 一、工作日耗时（单位：年/月/日/时/分 共五个）
 *   例：月薪 7000，双休（21.75 天），每日工作 9:00-18:00 且午休计入薪资
 *       dailySalary = 7000 / 21.75 ≈ 321.84
 *       perMinute   = 321.84 / 540  ≈ 0.596
 *   商品 9.9：9.9 / 0.596 = 16.61 分钟          -> 16.6分钟
 *   商品 15 ：15  / 0.596 = 25.17 分钟          -> 25.2分钟
 *   商品 6000：6000 / 321.84 = 18.64 天
 *       18 天整 = 18 * 321.84 = 5793.12，剩余 206.88
 *       206.88 / 35.76(每小时) = 5.785 小时      -> 18天5小时47.1分钟
 *   思路：先算总工作分钟数 = 金额 / perMinute，
 *         再依次拆成 年 -> 月 -> 日 -> 时 -> 分（最小单位，1位小数）。
 *
 * 二、自然日耗时（单位：日/时/分 共三个，含周末与节假日，按真实日历推算）
 *   1) 金额 < dailySalary -> 当天即可赚到，按工作时长展示（不足1小时只显示分钟，
 *      超过1小时显示 时+分），口径与工作日耗时一致
 *   2) 否则先按「整年/整月」拆分：
 *        years  = 金额 / (月薪*12) 取整
 *        months = 剩余 / 月薪       取整
 *      参考日期 = 今天 + years 年 + months 月（按真实日历加，非平均 30 天）
 *      例：商品 15000，月薪 7000：
 *          15000 < 7000*12=84000，先减 2 个月 => 15000 - 14000 = 1000
 *   3) 剩余金额所需工作日数 = 剩余 / dailySalary（可含小数）
 *      从参考日期起逐自然日判断是否工作日并累计，累计到 >= 所需数，
 *      最后一个「部分工作日」也占一个自然日，得到完成日期。
 *   4) 计算「今天 -> 完成日期」的自然日跨度，再拆成 天 -> 时 -> 分（最小单位，1位小数）。
 *      最后一个不足一天的部分工作日，换算成 时 / 分。
 *   例：商品 6000，需 18.64 个工作日，从今天往后数第 19 个工作日
 *       对应的自然日约为 26 天 -> 26天
 * ============================================================ */
