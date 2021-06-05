let options = {
  duration: 3,
  counter: true,
  progress: true,
};

function handleInput(event) {
  const input = event.target;
  options[input.id] = input.type === "checkbox" ? input.checked : input.value;
  chrome.storage.sync.set({ options });
  console.log("updated", options);
}

function initialize() {
  console.log("initializing");
  chrome.storage.sync.get("options", (data) => {
    console.log("get data", JSON.stringify(data));
    options = { ...options, ...(data?.options ?? {}) };

    console.log("initialized", JSON.stringify(options));

    // update form
    document.getElementById("duration").value = options.duration;
    document.getElementById("counter").checked = options.counter;
    document.getElementById("progress").checked = options.progress;

    document.addEventListener("input", handleInput);
  });
}

initialize();
