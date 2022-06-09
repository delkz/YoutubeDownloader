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
let errors = 0;
let warnings = 0;
let fail = 0;
let success = 0;

const downloadVideos = () => {
  let now = new Date();

  console.log("\n 😎 scrapper started " + now.toString() + "\n");

  const finishApp = () =>{
      if (progress >= quantity) {
        let now = new Date();
        console.log("\n🎉 All downloads completed | " + now.toString());
        console.log(`✅ -> ${success} ❌ -> ${errors} ⚠️ -> ${warnings} 🟥 -> ${fail}`);
        process.exit(1);
      }
  }

  urls.forEach((ref, index) => {
    const errorReturn = (status) => {
      progress += 1;
      errors += 1;
      console.log(
        `❌ download failed -> dist/${fileName} (${progress}/${quantity}) | ${status}`
      );
      finishApp();
    }
      // Variables
      const title = ref.title;
      const link = ref.link;
      const fileName = title;

      //
      if (fs.existsSync("dist/" + fileName)) {
        progress += 1;
        warnings += 1
        console.log("⚠️  dist/" + fileName + " already exists... skipping ("+progress+"/"+quantity+")");
        finishApp();
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
          const audio = ytdl(link, { quality: "highestaudio",dlChunkSize: 0 })
          
          audio.on(
            "progress",
            (_, downloaded, total) => {
              tracker.audio = { downloaded, total };
              // console.log("Audio -> "+ fileName + " ",downloaded," / ",total );
            }
          )
          // audio.on('close',(e)=>{errorReturn('close')})
          // audio.on('data',(e)=>{errorReturn('data')})
          // audio.on('end',(e)=>{errorReturn('end')})
          // audio.on('error',(e)=>{errorReturn('error')})
          // audio.on('pause',(e)=>{errorReturn('pause')})
          // audio.on('readable',(e)=>{errorReturn('readable')})
          // audio.on('resume',(e)=>{errorReturn('resume')})

          const video = ytdl(link, { quality: "highestvideo",dlChunkSize: 0 }).on(
            "progress",
            (_, downloaded, total) => {
              tracker.video = { downloaded, total };
              // console.log("Video -> "+ fileName +" ",downloaded," / ",total );
            }
          );
          // video.on('close',(e)=>{errorReturn('close')})
          // video.on('data',(e)=>{errorReturn('data')})
          // video.on('end',(e)=>{errorReturn('end')})
          video.on('error',(error) =>{errorReturn('error');/*console.log(error)*/})
          // video.on('pause',(e)=>{errorReturn('pause')})
          // video.on('readable',(e)=>{errorReturn('readable')})
          // video.on('resume',(e)=>{errorReturn('resume')})
          

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
            progress += 1;
            success += 1;
            console.log(
              "✅ download completed (" +
                progress +
                "/" +
                quantity +
                ") : dist/" +
                fileName
            );
            finishApp();
            // Cleanup
            // process.stdout.write("\n\n\n\n");
          });
          // on(event: 'close', listener: (code: number | null, signal: NodeJS.Signals | null) => void): this;
          // on(event: 'disconnect', listener: () => void): this;
          // on(event: 'error', listener: (err: Error) => void): this;
          // on(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): this;
          // on(event: 'message', listener: (message: Serializable, sendHandle: SendHandle) => void): this;


          ffmpegProcess.on("error", () => { errorReturn("error") });
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


          }, 250);
        } else {
          progress += 1;
          console.log("🟥 " + fileName + " -> Missing Youtube link ("+progress+"/"+quantity+")");
          fail += 1;
          finishApp();
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
