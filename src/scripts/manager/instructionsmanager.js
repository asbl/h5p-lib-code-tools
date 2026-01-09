export default class InstructionsManager {
  constructor(
    contendId,
    instructions,
    instructionsImage,
    pageManager,
    buttonManager,
    l10n,
  ) {
    this.instructions = instructions || "";
    this.instructionsImage = instructionsImage || null;
    this.pageManager = pageManager;
    this.buttonManager = buttonManager;
    this.contentId = contendId;
    this.l10n = l10n;
  }

  async setupInstructions() {}

  getDOM() {
    console.log("render instructions");
    if (!this.instructions) return null; // Exit if no instructions

    const fragment = document.createDocumentFragment(); // Create a fragment for performance

    // Add Markdown content
    const markdownDiv = new H5P.Markdown(this.instructions).getMarkdownDiv();
    fragment.append(markdownDiv);

    // Add optional image
    console.log(this.instructionsImage);
    if (this.instructionsImage?.path) {
      const img = document.createElement("img");
      img.className = "description-image";
      img.src = H5P.getPath(this.instructionsImage.path, this.contentId);
      console.log(img.src, this.instructionsImage.path, this.contendId);
      img.alt = this.instructionsImage.copyright?.title || "";
      fragment.append(img);
    }
    return fragment; // Return the fragment
  }

  getHTMLClasses() {
    return this.instructions != ""
      ? " has_instructions"
      : " not_has_instructions";
  }
}
