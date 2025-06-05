/**
 * farvardin-fixed.js - A simplified Iranian/Persian (Jalali) calendar converter
 * Based on the original farvardin.js library but fixed for browser usage
 */

(function(global) {
    // Constants for Persian and Gregorian calendars
    const PERSIAN_MONTH_DAYS = {1:31, 2:31, 3:31, 4:31, 5:31, 6:31, 7:30, 8:30, 9:30, 10:30, 11:30, 12:29};
    const GREGORIAN_MONTH_DAYS = {1:31, 2:28, 3:31, 4:30, 5:31, 6:30, 7:31, 8:31, 9:30, 10:31, 11:30, 12:31};
    
    // Helper functions
    function isLeapPersian(year) {
        return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
    }
    
    function isLeapGregorian(year) {
        return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
    }
    
    // Main conversion function
    function gregorianToSolar(year, month, day, formatType) {
        // Default to array format if not specified
        if (formatType === undefined) {
            formatType = "array";
        }
        
        // Input validation
        if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
            return "Invalid Input";
        }
        
        // Calculate Persian date
        // For simplification, use a basic approximation algorithm
        let persianYear = year - 621;
        let persianMonth, persianDay;
        
        // Adjust for month differences
        if (month < 3 || (month === 3 && day < 21)) {
            persianYear--;
        }
        
        // Determine Persian month and day
        if (month === 1) {
            if (day <= 20) {
                persianMonth = 10;
                persianDay = day + 10;
            } else {
                persianMonth = 11;
                persianDay = day - 20;
            }
        } else if (month === 2) {
            if (day <= 19) {
                persianMonth = 11;
                persianDay = day + 11;
            } else {
                persianMonth = 12;
                persianDay = day - 19;
            }
        } else if (month === 3) {
            if (day <= 20) {
                persianMonth = 12;
                persianDay = day + 9;
            } else {
                persianMonth = 1;
                persianDay = day - 20;
            }
        } else if (month === 4) {
            if (day <= 20) {
                persianMonth = 1;
                persianDay = day + 11;
            } else {
                persianMonth = 2;
                persianDay = day - 20;
            }
        } else if (month === 5) {
            if (day <= 21) {
                persianMonth = 2;
                persianDay = day + 10;
            } else {
                persianMonth = 3;
                persianDay = day - 21;
            }
        } else if (month === 6) {
            if (day <= 21) {
                persianMonth = 3;
                persianDay = day + 10;
            } else {
                persianMonth = 4;
                persianDay = day - 21;
            }
        } else if (month === 7) {
            if (day <= 22) {
                persianMonth = 4;
                persianDay = day + 9;
            } else {
                persianMonth = 5;
                persianDay = day - 22;
            }
        } else if (month === 8) {
            if (day <= 22) {
                persianMonth = 5;
                persianDay = day + 9;
            } else {
                persianMonth = 6;
                persianDay = day - 22;
            }
        } else if (month === 9) {
            if (day <= 22) {
                persianMonth = 6;
                persianDay = day + 9;
            } else {
                persianMonth = 7;
                persianDay = day - 22;
            }
        } else if (month === 10) {
            if (day <= 22) {
                persianMonth = 7;
                persianDay = day + 8;
            } else {
                persianMonth = 8;
                persianDay = day - 22;
            }
        } else if (month === 11) {
            if (day <= 21) {
                persianMonth = 8;
                persianDay = day + 9;
            } else {
                persianMonth = 9;
                persianDay = day - 21;
            }
        } else if (month === 12) {
            if (day <= 21) {
                persianMonth = 9;
                persianDay = day + 9;
            } else {
                persianMonth = 10;
                persianDay = day - 21;
            }
        }
        
        // Format the result based on the requested format
        if (formatType === "array") {
            return [persianYear, persianMonth, persianDay];
        } else if (formatType === "string") {
            return persianYear + "-" + 
                (persianMonth <= 9 ? "0" + persianMonth : persianMonth) + "-" + 
                (persianDay <= 9 ? "0" + persianDay : persianDay);
        } else if (formatType === "object") {
            return {
                year: persianYear,
                month: persianMonth,
                day: persianDay
            };
        } else if (formatType === "json") {
            return JSON.stringify({
                year: persianYear,
                month: persianMonth,
                day: persianDay
            });
        } else {
            throw "Invalid Type";
        }
    }
    
    function solarToGregorian(year, month, day, formatType) {
        // Default to array format if not specified
        if (formatType === undefined) {
            formatType = "array";
        }
        
        // Input validation
        if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
            return "Invalid Input";
        }
        
        // Calculate Gregorian date
        // For simplification, use a basic approximation algorithm
        let gregorianYear = year + 621;
        let gregorianMonth, gregorianDay;
        
        // Determine Gregorian month and day
        if (month === 1) {
            if (day <= 11) {
                gregorianMonth = 3;
                gregorianDay = day + 20;
            } else {
                gregorianMonth = 4;
                gregorianDay = day - 11;
            }
        } else if (month === 2) {
            if (day <= 10) {
                gregorianMonth = 4;
                gregorianDay = day + 20;
            } else {
                gregorianMonth = 5;
                gregorianDay = day - 10;
            }
        } else if (month === 3) {
            if (day <= 10) {
                gregorianMonth = 5;
                gregorianDay = day + 21;
            } else {
                gregorianMonth = 6;
                gregorianDay = day - 10;
            }
        } else if (month === 4) {
            if (day <= 9) {
                gregorianMonth = 6;
                gregorianDay = day + 21;
            } else {
                gregorianMonth = 7;
                gregorianDay = day - 9;
            }
        } else if (month === 5) {
            if (day <= 9) {
                gregorianMonth = 7;
                gregorianDay = day + 22;
            } else {
                gregorianMonth = 8;
                gregorianDay = day - 9;
            }
        } else if (month === 6) {
            if (day <= 9) {
                gregorianMonth = 8;
                gregorianDay = day + 22;
            } else {
                gregorianMonth = 9;
                gregorianDay = day - 9;
            }
        } else if (month === 7) {
            if (day <= 8) {
                gregorianMonth = 9;
                gregorianDay = day + 22;
            } else {
                gregorianMonth = 10;
                gregorianDay = day - 8;
            }
        } else if (month === 8) {
            if (day <= 9) {
                gregorianMonth = 10;
                gregorianDay = day + 22;
            } else {
                gregorianMonth = 11;
                gregorianDay = day - 9;
            }
        } else if (month === 9) {
            if (day <= 9) {
                gregorianMonth = 11;
                gregorianDay = day + 21;
            } else {
                gregorianMonth = 12;
                gregorianDay = day - 9;
            }
        } else if (month === 10) {
            if (day <= 10) {
                gregorianMonth = 12;
                gregorianDay = day + 21;
            } else {
                gregorianMonth = 1;
                gregorianDay = day - 10;
                gregorianYear++;
            }
        } else if (month === 11) {
            if (day <= 11) {
                gregorianMonth = 1;
                gregorianDay = day + 20;
                gregorianYear++;
            } else {
                gregorianMonth = 2;
                gregorianDay = day - 11;
                gregorianYear++;
            }
        } else if (month === 12) {
            if (day <= 9) {
                gregorianMonth = 2;
                gregorianDay = day + 19;
                gregorianYear++;
            } else {
                gregorianMonth = 3;
                gregorianDay = day - 9;
                gregorianYear++;
            }
        }
        
        // Format the result based on the requested format
        if (formatType === "array") {
            return [gregorianYear, gregorianMonth, gregorianDay];
        } else if (formatType === "string") {
            return gregorianYear + "-" + 
                (gregorianMonth <= 9 ? "0" + gregorianMonth : gregorianMonth) + "-" + 
                (gregorianDay <= 9 ? "0" + gregorianDay : gregorianDay);
        } else if (formatType === "object") {
            return {
                year: gregorianYear,
                month: gregorianMonth,
                day: gregorianDay
            };
        } else if (formatType === "json") {
            return JSON.stringify({
                year: gregorianYear,
                month: gregorianMonth,
                day: gregorianDay
            });
        } else {
            throw "Invalid Type";
        }
    }
    
    // Create the farvardin object
    const farvardin = {
        gregorianToSolar: gregorianToSolar,
        solarToGregorian: solarToGregorian
    };
    
    // Expose to global scope
    global.farvardin = farvardin;
    
})(typeof window !== 'undefined' ? window : this); 