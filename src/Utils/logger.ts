import winston from "winston";

const logger = winston.createLogger({

    level: "info",

    format: winston.format.combine(

        winston.format.timestamp(),

        winston.format.errors({
            stack: true
        }),

        winston.format.printf((info) => {

            return `
[${info.timestamp}]
LEVEL: ${info.level.toUpperCase()}

MESSAGE:
${info.message}

STACK:
${info.stack || "No Stack Trace"}

-----------------------------------
`;
        })
    ),

    transports: [

        // console output
        new winston.transports.Console(),

        // only errors
        new winston.transports.File({
            filename: "logs/error.log",
            level: "error"
        }),

        // all logs
        new winston.transports.File({
            filename: "logs/combined.log"
        })
    ]
});

export default logger;