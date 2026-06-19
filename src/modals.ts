import {  Modal, App} from 'obsidian'



interface ModalConfig {
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  textboxText?: string;
  confirmButton?: string;

  onOpen?: () => void;
  onClose?: () => void;

  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
}

export class InputModal extends Modal {
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

    this.inputEl.addClass("modal-input");
    

    this.inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        confirmBtn.click();
      }
    });


    const buttonContainer = contentEl.createEl("div");

    buttonContainer.addClass("modal-button-container");


    // Confirm button
    const confirmBtn = buttonContainer.createEl("button", {
      text: this.config.confirmText ?? "Confirm",
    });

      confirmBtn.addClass("modal-left-button");

    confirmBtn.onclick = () => {
      const value = this.inputEl.value;
      this.config.onConfirm(value);
      this.close(); 
    };

    // Cancel button
    const cancelBtn = buttonContainer.createEl("button", {
      text: this.config.cancelText ?? "Cancel",
    });

      cancelBtn.addClass("modal-right-button");

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

export class ConfirmationModal extends Modal {
  config: ModalConfig;


  constructor(app: App, config: ModalConfig) {
    super(app);
    this.config = config;
  }

  onOpen() {
    this.config.onOpen?.();

    const { contentEl } = this;

    contentEl.createEl("h2", {
      text: this.config.confirmText ?? "",
    });




    const buttonContainer = contentEl.createEl("div");

    buttonContainer.addClass("modal-button-container");


    // Confirm button
    const confirmBtn = buttonContainer.createEl("button", {
      text: this.config.confirmButton ?? "Confirm",
    });

    confirmBtn.addClass("modal-left-button");

    confirmBtn.onclick = () => {
      this.config.onConfirm(); 
      this.close();
    };

    // Cancel button
    const cancelBtn = buttonContainer.createEl("button", {
      text: this.config.cancelText ?? "Cancel",
    });

    cancelBtn.addClass("modal-right-button");

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

interface SingleSelectModalConfig {
  title?: string;
  body?: string;
  options: string[];
  initialValue?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;

  onOpen?: () => void;
  onClose?: () => void;

  onConfirm: (selectedValue: string) => void;
  onCancel: () => void;
}

export class SingleSelectModal extends Modal {
  config: SingleSelectModalConfig;
  selectEl!: HTMLSelectElement;

  constructor(app: App, config: SingleSelectModalConfig) {
    super(app);
    this.config = config;
  }

  onOpen() {
    this.config.onOpen?.();

    const { contentEl } = this;

    contentEl.createEl("h2", {
      text: this.config.title ?? "Select an option",
    });


    contentEl.createEl("div", {
      text: this.config.body ?? "",
      attr: { style: "margin-bottom: 15px;" }
    
    });

    // Select dropdown
    this.selectEl = contentEl.createEl("select");

    this.selectEl.addClass("modal-input");

    this.config.options.forEach((optionText) => {
      const optionEl = this.selectEl.createEl("option", {
        text: optionText,
        value: optionText,
      });
      if (optionText === this.config.initialValue) {
        optionEl.selected = true;
      }
    });

    const buttonContainer = contentEl.createEl("div");

    buttonContainer.addClass("modal-button-container");

    // Confirm button
    const confirmBtn = buttonContainer.createEl("button", {
      text: this.config.confirmButtonText ?? "Confirm",
    });

    confirmBtn.addClass("modal-left-button");
    
    confirmBtn.onclick = () => {
      const value = this.selectEl.value;
      this.config.onConfirm(value);
      this.close(); 
    };

    // Cancel button
    const cancelBtn = buttonContainer.createEl("button", {
      text: this.config.cancelButtonText ?? "Cancel",
    });

    cancelBtn.addClass("modal-right-button");

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
