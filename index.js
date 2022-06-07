// Buildin with nodejs
const cp = require("child_process");
const ytdl = require("ytdl-core");
const ffmpeg = require("ffmpeg-static");
const fs = require("fs");
let rawdata = fs.readFileSync("sites.json");
let urls = JSON.parse(rawdata);
const dir = './dist';
//
let quantity = urls.length;
let progress = 0;



const downloadVideos = () => {

  let now = new Date();
  console.log("😎 download started " + now.toString());
  
  urls.forEach((ref, index) => {
    const tracker = {
      start: Date.now(),
      audio: { downloaded: 0, total: Infinity },
      video: { downloaded: 0, total: Infinity },
      merged: { frame: 0, speed: "0x", fps: 0 },
    };
    console.log("🚧 aula-" + (index + 1) + ".mkv -> Started");
    const audio = ytdl(ref, { quality: "highestaudio" }).on(
      "progress",
      (_, downloaded, total) => {
        tracker.audio = { downloaded, total };
        //   console.log("Audio -> ",downloaded," / ",total );
      }
    );
    const video = ytdl(ref, { quality: "highestvideo" }).on(
      "progress",
      (_, downloaded, total) => {
        tracker.video = { downloaded, total };
        //   console.log("Video -> ",downloaded," / ",total );
      }
    );
  
    const ffmpegProcess = cp.spawn(
      ffmpeg,
      [
        // Remove ffmpeg's console spamming
        "-loglevel",
        "8",
        "-hide_banner",
        // Redirect/Enable progress messages
        "-progress",
        "pipe:3",
        // Set inputs
        "-i",
        "pipe:4",
        "-i",
        "pipe:5",
        // Map audio & video from streams
        "-map",
        "0:a",
        "-map",
        "1:v",
        // Keep encoding
        "-c:v",
        "copy",
        // Define output file
        "dist/aula-" + (index + 1) + ".mkv",
      ],
      {
        windowsHide: true,
        stdio: [
          /* Standard: stdin, stdout, stderr */
          "inherit",
          "inherit",
          "inherit",
          /* Custom: pipe:3, pipe:4, pipe:5 */
          "pipe",
          "pipe",
          "pipe",
        ],
      }
    );
    ffmpegProcess.on("close", () => {
      progress = progress + 1;
      console.log(
        "✅download completed (" +
          progress +
          "/" +
          quantity +
          ") : dist/aula-" +
          (index + 1) +
          ".mkv"
      );
      // Cleanup
      // process.stdout.write("\n\n\n\n");
    });
  
    // Link streams
    // FFmpeg creates the transformer streams and we just have to insert / read data
    ffmpegProcess.stdio[3].on("data", (chunk) => {
      // Parse the param=value list returned by ffmpeg
      const lines = chunk.toString().trim().split("\n");
      const args = {};
      for (const l of lines) {
        const [key, value] = l.split("=");
        args[key.trim()] = value.trim();
      }
      tracker.merged = args;
    });
    audio.pipe(ffmpegProcess.stdio[4]);
    video.pipe(ffmpegProcess.stdio[5]);
  
    if (progress >= quantity) {
      let now = new Date();
      console.log("🎉 All downloads completeds | "+ now.toString());
    }
  });
  
}


if (fs.existsSync(dir) == false) {
  fs.mkdirSync(dir, 0744);
  downloadVideos();
}else{
  downloadVideos();
}