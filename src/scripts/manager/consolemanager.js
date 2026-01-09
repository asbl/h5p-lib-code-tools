export default class ConsoleManager {
  constructor(hasConsole, consoleUID, consoleType) {
    this.consoleUID = consoleUID;
    this.hasConsole = hasConsole ?? true;
    this.consoleType = consoleType || "textarea";
  }

  getDOM() {
    // Return null if console is not enabled
    if (!this.hasConsole) return null;

    // Create wrapper div for the console
    const wrapper = document.createElement("div");
    wrapper.classList.add("console_wrapper", "console-wrapper", "hidden");

    // Create and append header div
    const header = document.createElement("div");
    header.id = "h5p_cm_console_header";
    header.classList.add("cm", "console", "console-header");
    header.textContent = "Console"; // Display title
    wrapper.appendChild(header);

    // Create console body (textarea or div based on type)
    let body;
    if (this.consoleType === "textarea") {
      body = document.createElement("textarea");
      body.readOnly = true; // Make it read-only
    } else {
      body = document.createElement("div");
      body.setAttribute("readonly", ""); // Optional for consistency
    }

    // Set ID and classes for styling
    body.id = this.consoleUID;
    body.classList.add("console", "console-body");
    wrapper.appendChild(body);

    // Return the complete console wrapper element
    return wrapper;
  }

  clearConsole() {
    const el = document.getElementById(this.consoleUID);
    if (el) el.value = "";
  }

  /**
   * Hides console as div
   */
  hideConsole() {
    const el = document.getElementById(this.consoleUID).parentElement;
    el.classList.add("hidden");
  }

  /**
   * Shows the console
   */
  showConsole() {
    const el = document.getElementById(this.consoleUID).parentElement;
    el.classList.remove("hidden");
  }

  getHTMLClasses() {
    return this.hasConsole ? " has_console" : " not_has_console";
  }

  getConsole() {
    return document.getElementById(this.consoleUID);
  }
}
