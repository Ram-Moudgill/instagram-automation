const cron = require("node-cron");

const task = cron.schedule(
  "40 20 * * *",
  () => {
    console.log("Cron job running at 8:40pm IST");
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);

task.start();
