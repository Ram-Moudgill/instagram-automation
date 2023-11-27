const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");

// Assuming videoBuffer is the Buffer containing your video data
const videoBuffer = fs.readFileSync("./uploads/vid.mp4");

const outputPath = "./uploads/";

// Create a readable stream from the video buffer
const videoStream = new require("stream").Readable();
videoStream.push(videoBuffer);
videoStream.push(null);

ffmpeg()
  .input(videoStream)
  .inputFormat("mp4") // Replace with the actual video format if known
  .screenshots({
    count: 1,
    folder: outputPath,
    filename: "11.jpg",
    timemarks: ["1"], // Set a fixed timemark, adjust as needed
  })
  .on("end", () => {
    console.log("First frame extracted successfully!");
  })
  .on("error", (err) => {
    console.error("Error extracting first frame:", err);
  });
