const html = `<div id="fcig_lightbox">
    <div id="fcig_grid"></div>
    <div id="fcig_image">
      <img id="fcig_image1" class="fcig_image"/>
      <img id="fcig_image2" class="fcig_image"/>
      <video id="fcig_video" autoplay controls></video>
    </div>
    <div id="fcig_instructions">
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
        <div style="font-size:24px;font-weight:bold;">4chan Image Gallery X</div>
        <div style="font-size:20px;">Version 1.0.0</div>
      </div>
      <table>
        <tr><th>/ or ?</th><td>View Help</td></tr>
        <tr><th>G</th><td>Grid View</td></tr>
        <tr><th>➡️ or J</th><td>Next Image</td></tr>
        <tr><th>⬅️ or K</th><td>Previous Image</td></tr>
        <tr><th>F</th><td>First Image</td></tr>
        <tr><th>L</th><td>Last Image</td></tr>
        <tr><th>U</th><td>Update</td></tr>
        <tr><th>S</th><td>Start Slideshow</td></tr>
        <tr><th>Space</th><td>Stop Slideshow</td></tr>
        <tr><th>Esc</th><td>Close View</td></tr>
      </table>
      <p><a href="mailto:jack.tremor@gmail.com">jack.tremor@gmail.com</a></p>
      <div style="display:flex;gap:8px;align-items:center;justify-content:center;">
        <svg style="display:inline-block;height:24px;width:24px;color:#fff;" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
        <a href="https://github.com/jacktremor/4chan-image-gallery-x">View on GitHub</a>
      </div>
    </div>
  </div>
  <div id="fcig_counter"></div>
  `;

let options = {
  duration: 3,
  counter: true,
  progress: true,
};

// render ui if settings change
chrome.storage.onChanged.addListener(render);

async function getOptions() {
  const promise = new Promise((resolve) => {
    chrome.storage.sync.get("options", (data) => {
      options = { ...options, ...(data?.options ?? {}) };
      resolve(data.options);
    });
  });
  return promise;
}

const wrapper = document.createElement("div");
wrapper.innerHTML = html;
document.body.appendChild(wrapper);

const lightbox = document.getElementById("fcig_lightbox");
const grid = document.getElementById("fcig_grid");
const image = document.getElementById("fcig_image");
const image1 = document.getElementById("fcig_image1");
const image2 = document.getElementById("fcig_image2");
const video = document.getElementById("fcig_video");
const instructions = document.getElementById("fcig_instructions");
const counter = document.getElementById("fcig_counter");

document.body.addEventListener("keyup", handleKeyUp);
grid.addEventListener("click", handleImageClick);
image1.addEventListener("load", handleImageLoad);
image2.addEventListener("load", handleImageLoad);
video.addEventListener("play", handleVideoPlay);
video.addEventListener("ended", handleVideoEnded);

const machine = createMachine(
  (config = config =
    {
      initial: "idle",
      states: {
        idle: {},
        grid: {},
        image: {},
        instructions: {},
      },
      on: {
        RESET: { target: "idle", actions: ["stopSlideShow"] },
        GRID: { target: "grid", actions: ["stopSlideShow"] },
        IMAGE: { target: "image", actions: ["showImage"] },
        NEXT: { target: "image", actions: ["nextImage"] },
        PREVIOUS: { target: "image", actions: ["previousImage"] },
        FIRST: { target: "image", actions: ["firstImage"] },
        LAST: { target: "image", actions: ["lastImage"] },
        UPDATE: { actions: ["updateThread"] },
        UPDATED: { actions: ["handleUpdate"] },
        START: { target: "image", actions: ["startSlideShow", "nextImage"] },
        STOP: { actions: ["stopSlideShow"] },
        INSTRUCTIONS: { target: "instructions", actions: ["stopSlideShow"] },
      },
    }),
  (actions = {
    showImage: ({ context, payload }) => {
      context.index = payload;
    },
    nextImage: ({ context, send }) => {
      if (context.index < context.links.length - 1) {
        context.index++;
      } else {
        send("STOP");
      }
    },
    previousImage: ({ context }) => {
      if (context.index > 0) {
        context.index--;
      }
    },
    firstImage: ({ context }) => {
      context.index = 0;
    },
    lastImage: ({ context }) => {
      context.index = context.links.length - 1;
    },
    startSlideShow: ({ context }) => {
      context.isPlaying = true;
    },
    stopSlideShow: ({ context }) => {
      context.isPlaying = false;
      if (context.timerId) {
        window.clearTimeout(context.timerId);
        context.timerId = null;
      }
    },
    updateThread: () => {
      document.querySelector("a[data-cmd=update]").click();
    },
    handleUpdate: ({ context, payload }) => {
      context.links = payload;
      context.gridInitialized = false;
    },
  }),
  (initialContext = {
    index: -1,
    lastIndex: -1,
    currImage: 1,
    links: document.querySelectorAll("a.fileThumb"),
    gridInitialized: false,
    isPlaying: false,
    timerId: null,
    progressTimerId: null,
  })
);
machine.onTransition = render;

let progress = null;
function handleImageLoad() {
  if (machine.context.isPlaying) {
    if (progress) {
      wrapper.removeChild(progress);
      progress = null;
    }
    progress = document.createElement("div");
    progress.classList.add("fcig_progress");
    progress.style.opacity = options.progress ? 1 : 0;
    progress.style.width = 0;
    progress.style.transition = `width ${options.duration}s ease-in`;
    wrapper.appendChild(progress);

    progress.addEventListener("transitionend", () => {
      machine.send("NEXT");
    });
    window.setTimeout(() => {
      progress.style.width = "100%";
    }, 100);
  }
}

function handleVideoPlay() {
  if (machine.context.progressTimerId) {
    window.clearInterval(machine.context.progressTimerId);
  }
  if (progress) {
    wrapper.removeChild(progress);
  }
  progress = document.createElement("div");
  progress.classList.add("fcig_progress");
  progress.style.width = 0;
  progress.style.display = options.progress ? "block" : "none";

  wrapper.appendChild(progress);

  machine.context.progressTimerId = window.setInterval(function () {
    if (machine.state !== "image") {
      window.clearInterval(machine.context.progressTimerId);
      machine.context.progressTimerId = null;
    }
    if (progress) {
      progress.style.width = `${(video.currentTime * 100.0) / video.duration}%`;
    }
  }, 1000);
}
function handleVideoEnded() {
  if (progress) {
    progress.style.width = "100%";
  }
  if (machine.context.progressTimerId) {
    window.clearInterval(machine.context.progressTimerId);
  }
  if (machine.context.isPlaying) {
    if (machine.context.timerId) {
      window.clearTimeout(machine.context.timerId);
    }
    machine.context.timerId = window.setTimeout(
      () => machine.send("NEXT"),
      2000
    );
  }
}

function handleImageClick(event) {
  if (event.target.tagName === "IMG") {
    index = parseInt(event.target.parentElement.dataset.index);
    machine.send("IMAGE", index);
  }
}

const keymap = {
  Escape: "RESET",
  KeyG: "GRID",
  KeyU: "UPDATE",
  KeyS: "START",
  Space: "STOP",
  ArrowRight: "NEXT",
  KeyJ: "NEXT",
  ArrowLeft: "PREVIOUS",
  KeyK: "PREVIOUS",
  KeyF: "FIRST",
  KeyL: "LAST",
  Slash: "INSTRUCTIONS",
};

function handleKeyUp(event) {
  const target = event.target;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

  const message = keymap[event.code];
  if (message) machine.send(message);
}

const observer = new MutationObserver(function () {
  machine.send("UPDATED", document.querySelectorAll("a.fileThumb"));
});
observer.observe(document.querySelector("div.thread"), {
  attributes: false,
  childList: true,
  subtree: true,
});

async function render() {
  let target = null;
  const view = machine.state;
  const { index, currImage, links, gridInitialized } = machine.context;
  let nextImage = currImage;
  options = await getOptions();

  if (view == "grid") {
    if (!gridInitialized) {
      let html = "";
      Array.from(links).forEach((link, i) => {
        const img = link.querySelector("img");
        html += `<div data-index="${i}">
          <img src="${img.getAttribute("src")}"/>
          </div>`;
      });
      grid.innerHTML = html;
    }

    if (index > 0) {
      grid.querySelector("div.current")?.classList.remove("current");
      target = grid.querySelector(`div[data-index="${index}"]`);
      target.classList.add("current");
    }
  } else if (view === "image") {
    const src = links[index].getAttribute("href");
    const image = currImage === 1 ? image1 : image2;
    nextImage = currImage === 1 ? 2 : 1;

    if (src.endsWith(".webm")) {
      video.src = src;
      image.src = "";
      video.blur();
      isVideo = true;
    } else {
      image.src = src;
      video.src = "";
      isVideo = false;
    }
    links[index].scrollIntoView();

    if (index < links.length - 2) {
      const src = links[index + 1].getAttribute("href");
      if (!src.endsWith(".webm")) {
        const preload = new Image(100, 100);
        preload.src = src;
      }
    }
  }
  grid.style.display = view === "grid" ? "flex" : "none";
  if (view === "grid") grid.focus();

  image.style.display = view === "image" ? "grid" : "none";

  image1.classList.toggle(
    "current",
    view === "image" && !isVideo && currImage === 1
  );
  image2.classList.toggle(
    "current",
    view === "image" && !isVideo && currImage === 2
  );
  machine.context.currImage = nextImage;
  if (progress && (view !== "image" || !isVideo)) {
    wrapper.removeChild(progress);
    progress = null;
  }
  video.style.opacity = view === "image" && isVideo ? 1 : 0;
  instructions.style.display = view === "instructions" ? "flex" : "none";
  lightbox.style.display = view === "idle" ? "none" : "grid";
  counter.style.display =
    view === "image" && options.counter ? "block" : "none";
  lightbox.style.height = view === "image" ? "100vh" : "auto";

  document.body.classList.toggle("fcig_noscroll", view !== "idle");

  counter.innerText = `${index + 1} / ${links.length}`;

  if (target) {
    target.scrollIntoView();
  }
}

/// State Machine
function createMachine(config) {
  function execute(actions, machine, payload) {
    if (!actions) return;
    if (Array.isArray(actions)) {
      actions.forEach((action) => execute(action, machine, payload));
      return;
    }
    const { context, send } = machine;
    if (typeof actions === "function") {
      const handler = actions(machine);
      if (typeof handler === "function") {
        handler({ context, send, payload });
      }
    }
    if (typeof actions === "string") {
      machine.actions[actions]({ context, send, payload });
    }
  }

  const machine = {
    state: config.initial,
    context: initialContext,
    actions: actions,
    transition: function (currentState, message, payload) {
      const currentStateDefinition = config.states[currentState];
      const destinationTransition =
        currentStateDefinition.on?.[message] ?? config.on?.[message];

      // no transition so stay in current state
      if (!destinationTransition) {
        return machine.state;
      }

      const targetState = destinationTransition.target ?? currentState;
      const targetStateDefinition = config.states[targetState];

      execute(currentStateDefinition.exit, machine, payload);
      execute(destinationTransition.actions, machine, payload);
      execute(targetStateDefinition.enter, machine, payload);

      machine.state = targetState;
      machine.onTransition();

      return machine.state;
    },
    send: function (message, payload) {
      return machine.transition(machine.state, message, payload);
    },
    onTransition: function () {},
  };
  return machine;
}

function send(message, payload) {
  return function (machine) {
    machine.send(message, payload);
  };
}
