export default {
    apps: [
      {
        name: "bot",
        script: "./main.ts",
        interpreter: "deno",
        time: true,
        interpreterArgs: "run --allow-read --allow-write --allow-net --allow-env",
      },
    ],
  };
  