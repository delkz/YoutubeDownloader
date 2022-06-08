// Buildin with nodejs
const cp = require("child_process");
const ytdl = require("ytdl-core");
const ffmpeg = require("ffmpeg-static");
const fs = require("fs");
let rawdata = fs.readFileSync("sites.json");
let urls = JSON.parse(rawdata);
const dir = "./dist";
//
let quantity = urls.length;
let progress = 0;

const downloadVideos = () => {
  let now = new Date();

  console.log("\n 😎 scrapper started " + now.toString() + "\n");

  urls.forEach((ref, index) => {
    
      // Variables
      const title = ref.title;
      const link = ref.link;
      const fileName = title;

      //
      if (fs.existsSync("dist/" + fileName)) {
        console.log("⚠️ dist/" + fileName + " already exists... skipping");
      } else {
        const tracker = {
          start: Date.now(),
          audio: { downloaded: 0, total: Infinity },
          video: { downloaded: 0, total: Infinity },
          merged: { frame: 0, speed: "0x", fps: 0 },
        };

        if (link !== "") {
          setTimeout(() => {
          console.log("🚧 " + fileName + " -> Started");
          const audio = ytdl(link, { quality: "highestaudio" }).on(
            "progress",
            (_, downloaded, total) => {
              tracker.audio = { downloaded, total };
              // console.log("Audio -> ",downloaded," / ",total );
            }
          );
          const video = ytdl(link, { quality: "highestvideo" }).on(
            "progress",
            (_, downloaded, total) => {
              tracker.video = { downloaded, total };
              // console.log("Video -> ",downloaded," / ",total );
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
              "dist/" + fileName,
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
                ") : dist/" +
                fileName
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
            console.log("🎉 All downloads completeds | " + now.toString());
          }
          }, 250);
        } else {
          console.log("🟥 " + fileName + " -> Missing Youtube link");
        }
      }
    

   });

};

if (fs.existsSync(dir) == false) {
  fs.mkdirSync(dir, 0744);
  downloadVideos();
} else {
  downloadVideos();
}
