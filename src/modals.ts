import {  Modal, App} from 'obsidian'



interface ModalConfig {
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  textboxText?: string;

  onOpen?: () => void;
  onClose?: () => void;

  onConfirm: (inputValue: string) => void;
  onCancel: () => void;
}

export class ModalTemplate extends Modal {
  config: ModalConfig;
  inputEl!: HTMLInputElement;

  constructor(app: App, config: ModalConfig) {
    super(app);
    this.config = config;
  }

  onOpen() {
    this.config.onOpen?.();

    const { contentEl } = this;

    const modalTitle = contentEl.createEl("h2",{
      text: this.config.confirmText ?? "" ,
    });

    // modalTitle.style.marginBottom = "6px";

    // Input field
    this.inputEl = contentEl.createEl("input", {
      type: "text",
      placeholder: this.config.placeholder ?? "Enter value",
      value: this.config.textboxText ?? "",

    });
    
    this.inputEl.style.marginBottom = "6px";
    this.inputEl.style.padding = "4px";
    this.inputEl.style.width = "80%";

    this.inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        confirmBtn.click();
      }
    });


    const buttonContainer = contentEl.createEl("div");
    buttonContainer.style.marginTop = "4px";
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "4px";

    // Confirm button
    const confirmBtn = buttonContainer.createEl("button", {
      text: this.config.confirmText ?? "Confirm",
    });

      confirmBtn.style.padding = "4px 8px";
      confirmBtn.style.marginRight = "auto";
      confirmBtn.style.marginLeft = "15%";
    confirmBtn.onclick = () => {
      const value = this.inputEl.value;
      this.config.onConfirm(value);
      this.close(); 
    };

    // Cancel button
    const cancelBtn = buttonContainer.createEl("button", {
      text: this.config.cancelText ?? "Cancel",
    });

      cancelBtn.style.padding = "4px 8px";
      cancelBtn.style.marginRight = "15%";
      cancelBtn.style.marginLeft = "auto";
    cancelBtn.onclick = () => {
      this.config.onCancel();
      this.close();
    };
  }

  onClose() {
    this.config.onClose?.();
    this.contentEl.empty();
  }
}