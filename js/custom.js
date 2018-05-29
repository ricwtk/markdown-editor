var split;
var presentationView;

function updateSplit(target) {
  if (!presentationView) {
    if (target.innerWidth < 840) {
      if (split) {
        split.destroy();
        split = null;
      }
      [document.querySelector("#editor-wrapper"),
      document.querySelector("#display-wrapper")].forEach(el => {
        el.classList.add("grow");
      })
    } else {
      [document.querySelector("#editor-wrapper"),
      document.querySelector("#display-wrapper")].forEach(el => {
        el.classList.remove("grow");
      })
      if (!split) {
        split = Split([
          document.querySelector("#editor-wrapper"),
          document.querySelector("#display-wrapper")
        ], {
          sizes: [50,50],
          gutterSize: 5,
          gutter: (index, direction) => {
            const gutter = document.createElement('div');
            gutter.className = `gutter gutter-${direction}`;
            return gutter;
          },
          onDrag: () => {
            if (content.slideshow !== null) {
              content.slideshow.events.emit("resize");
            }
          }
        });
      }
    }
  }
}

var hltheme = {
  list: [],
  theme: "default",
  themeDirectory: "css/highlight/",
  getAllHlthemes: function () {
    let req = new Request(this.themeDirectory + "index.html");
    return fetch(req).then(res => res.text()).then(t => {
      let rex = /<a\b[^>]*>([\s\S]*?)<\/a>/g;
      while ((res = rex.exec(t)) !== null) {
        if (res[1].endsWith(".css")) {
          this.list.push(res[1].slice(0,-4));
        }
      }
    });
  },
  changeHltheme: function (theme) {
    if (this.list.includes(theme)) {
      document.querySelectorAll("link").filter(el => el.href.includes(this.themeDirectory))[0].outerHTML = "";
      let el = document.createElement("link");
      el.rel = "stylesheet";
      el.href = this.themeDirectory + theme + ".css";
      document.querySelector("head").appendChild(el);
      this.theme = theme;
      return el;
    }
  },
  getThemeLocation: function () {
    return this.themeDirectory + this.theme + ".css";
  }
};

function updateSyntaxTheme() {
  let defaultTheme = signedInUser.preferences.defaultSyntaxTheme || "default";
  let documentTheme = signedInUser.preferences.documentSyntaxTheme ? signedInUser.preferences.documentSyntaxTheme[openedFile.id] || defaultTheme : defaultTheme;
  hltheme.changeHltheme(documentTheme);
}

var gd;
var signedInStatus = {
  google: false,
  onedrive: false,
  dropbox: false
}
var urlParams = (new URL(location)).searchParams;
var notiObj = {
  notifications: [],
  notify(msg, stat) {
    this.notifications.push({
      statusClass: stat ? "toast-" + stat : "",
      message: msg
    })
  }
}
var signedInUser = {
  name: "",
  email: "",
  profilePic: "",
  preferences: {}
}
var openedFile = {
  name: "Unsaved.md",
  id: "",
  paths: [],
  pathsInName: [],
  parents: [],
  canEdit: true,
  raw: "",
  saved: ""
}
var fileExplorerOptions = {
  type: 0,
  TYPE: {
    CREATENEW: 0,
    OPENFILE: 1,
    SAVEAS: 2
  }
}

const initialText = 
`# This is a h1 heading

This is normal text.

Paragraphs are separated with two newlines.

1. This is an ordered list.
2. There are two items on this list.

- This is an unordered list.
- There are also two items on this list.

\`\`\`
This is a code block
with multiple lines
\`\`\`

Supported markdown syntax can be found on the guide bar.
`;
openedFile.raw = initialText;

var modalLoading = new Vue({
  el: "#modal-loading",
  data: {
    activate: false,
    loadingText: "Loading more words",
    fontSizeStyle: {
      "font-size": "1000%"
    }
  },
  mounted: function () {
    window.addEventListener("resize", this.setFontSize);
    this.setFontSize();
  },
  beforeDestroy: function () {
    window.removeEventListener("resize", this.setFontSize);
  },
  watch: {
    "activate": function (val) {
      if (val) {
        this.setFontSize();
      }
    },
    "loadingText": function () {
      this.setFontSize();
    }
  },
  methods: {
    setFontSize: function () {
      let fs = parseInt(this.fontSizeStyle["font-size"].match(/\d+/g));
      let ww = window.innerWidth - 30;
      let tw = parseInt(window.getComputedStyle(this.$refs.loadingText).getPropertyValue("width").match(/\d+/g));
      let newfs = ww / tw * fs;
      if (!isNaN(newfs)) {
        this.fontSizeStyle["font-size"] = (ww / tw * fs) + "%";
      }
    }
  }
})

new Vue({
  el: "#navbar",
  data: {
    guides: mdguides,
    nguideshown: 3,
    openedFile: openedFile,
    notiObj: notiObj,
    saving: false,
    savingashtml: false
  },
  computed: {
    fileBar: function () {
      return {
        "background-color": this.openedFile.raw == this.openedFile.saved && this.openedFile.id ? "#8BC34A" : "#F44336"
      }
    },
    fileSavedString: function () {
      return this.openedFile.raw == this.openedFile.saved ? "File saved" : "File unsaved";
    }
  },
  methods: {
    clickUser: function () {
      document.querySelector("#modal-user").classList.toggle("active")
    },
    hideHeader: function () {
      this.$refs.titleBar.classList.add("hide");
      this.$refs.guideBar.classList.add("hide");
      this.$refs.hideHeaderAction.classList.add("hide");
      this.$refs.showHeaderAction.classList.remove("hide");
    },
    showHeader: function () {
      this.$refs.titleBar.classList.remove("hide");
      this.$refs.guideBar.classList.remove("hide");
      this.$refs.hideHeaderAction.classList.remove("hide");
      this.$refs.showHeaderAction.classList.add("hide");
    },
    getN: function (str) {
      if (str == "") return 0
      return parseInt(str.match(/\d+/g))
    },
    updateNGuideShown: function () {
      let barStyle = window.getComputedStyle(this.$el.querySelector("#md-guide"))
      let totalXPadding = this.getN(barStyle.getPropertyValue("padding")) + this.getN(barStyle.getPropertyValue("padding-left")) + this.getN(barStyle.getPropertyValue("padding-right"))
      this.nguideshown = (this.getN(barStyle.getPropertyValue("width")) - totalXPadding - 24) / (24+8)
    },
    clickGuide: function (g) {
      modalGuide.title = g.tooltip
      modalGuide.rawContent = g.guide
      modalGuide.toggleModal()
    },
    createNewFile: function () {
      fileExplorerOptions.type = fileExplorerOptions.TYPE.CREATENEW;
      modalFileExplorer.toggleModal();
    },
    saveFile: function () {
      if (this.openedFile.id) {
        this.saving = true;
        gd.updateFileContent(this.openedFile.id, this.openedFile.raw).then((res) => {
          if (res.status == 200) {
            this.openedFile.saved = this.openedFile.raw;
          } else {
            notiObj.notify(res.body, "error");
          }
          this.saving = false;
        });
      } else {
        this.saveAs();
      }
    },
    saveAs: function () {
      fileExplorerOptions.type = fileExplorerOptions.TYPE.SAVEAS;
      modalFileExplorer.toggleModal();
    },
    openFile: function () {
      fileExplorerOptions.type = fileExplorerOptions.TYPE.OPENFILE;
      modalFileExplorer.toggleModal();
    },
    saveAsHtml: function () {
      this.savingashtml = true;
      let mdcss = new Request("css/md-themes.css");
      let hlcss = new Request(hltheme.getThemeLocation());

      let filesToFetch = [mdcss, hlcss];

      Promise.all(filesToFetch.map(f => fetch(f))).then(res => 
        Promise.all(res.map(r => r.text()))
      ).then(t => {
        if (content.docOrPres == 0) // document
          return ["<!DOCTYPE html>\n<html>\n<head>\n",
            "<meta charset='utf-8'>\n",
            "<meta name='viewport' content='width=device-width, initial-scale=1'>\n",
            "<style>\n",
            t.join("\n"),
            "\n</style>\n</head>\n<body class='md-default'>\n",
            content.compiledDoc,
            "\n</body>\n</html>"
          ].join("");
        else // slide
          return ["<!DOCTYPE html>\n<html>\n<head>\n",
            "<meta charset='utf-8'>\n",
            "<meta name='viewport' content='width=device-width, initial-scale=1'>\n",
            "<style>\n",
            t.join("\n"),
            "\n</style>\n</head>\n<body class='md-default'>\n",
            "<textarea id='source'>", content.compiledDoc, "</textarea>\n",
            "<script>", jsForHtml, "\n",
            "var slideshow = remark.create({ converter: mdconverter, externalHighlighter: true });\n",
            "</script>\n",
            "</body>\n</html>"
          ].join("");
      }).then(c => {
        return gd.saveFileAsHtml(openedFile.parents[0], openedFile.name, c).then((res) => {
          notiObj.notify("Compiled HTML is saved in " + res.result.name, "success");
          this.savingashtml = false;
        });
      });
    },
    autosave: function () {
      setTimeout(() => {
        if (this.openedFile.id && this.openedFile.raw !== this.openedFile.saved) {
          this.saveFile();
        }
        this.autosave();
      }, 30000);
    },
    openPreferences: function () {
      modalPreferences.toggleModal();
    }
  },
  mounted: function () {
    this.$nextTick(() => {
      window.addEventListener("resize", this.updateNGuideShown);
      this.updateNGuideShown();
      this.autosave();
      window.addEventListener("keypress", (ev) => {
        if (ev.ctrlKey && !ev.shiftKey && !ev.altKey && !ev.metaKey && !ev.repeat && ev.key == "s") {
          this.saveFile();
          ev.preventDefault();
        } else if (ev.ctrlKey && ev.shiftKey && !ev.altKey && !ev.metaKey && !ev.repeat && ev.key == "S") {
          this.saveAs();
          ev.preventDefault();
        } else if (ev.ctrlKey && !ev.shiftKey && !ev.altKey && !ev.metaKey && !ev.repeat && ev.key == "o") {
          this.openFile();
          ev.preventDefault();
        }
      });
    })
  }
})


var modalUser = new Vue({
  el: "#modal-user",
  data: {
    signedIn: signedInStatus,
    signedInUser: signedInUser
  },
  methods: {
    closeModal: function () {
      if (Object.values(signedInStatus).some(el => el))
        this.$el.classList.toggle("active")
    },
    openPrivacyPolicy: function () {
      window.location = "privacy-policy.html";
    },
    signInGoogle: function () {
      gd.handleSignInClick();
    },
    signOut: function () {
      gd.handleSignOutClick();
    }
  }
})

var modalPreferences = new Vue({
  el: "#modal-preferences",
  data: {
    hltheme: hltheme,
    savedDocumentSyntaxTheme: null
  },
  computed: {
    defaultSyntaxTheme: {
      get: function () {
        return signedInUser.preferences.defaultSyntaxTheme || "default";
      },
      set: function (theme) {
        this.$set(signedInUser.preferences, "defaultSyntaxTheme", theme);
        gd.prefSetDefaultSyntaxTheme(theme);
        updateSyntaxTheme();
      }
    },
    useSeparateSyntaxTheme: {
      get: function () {
        return signedInUser.preferences.documentSyntaxTheme ? Object.keys(signedInUser.preferences.documentSyntaxTheme).includes(openedFile.id) : false;
      },
      set: function (tOf) {
        if (tOf) {
          if (!signedInUser.preferences.documentSyntaxTheme) signedInUser.preferences.documentSyntaxTheme = {};
          this.$set(signedInUser.preferences.documentSyntaxTheme, openedFile.id, this.savedDocumentSyntaxTheme);
          gd.prefSetDocumentSyntaxTheme(openedFile.id, this.savedDocumentSyntaxTheme);
        } else {
          if (signedInUser.preferences.documentSyntaxTheme && signedInUser.preferences.documentSyntaxTheme[openedFile.id]) { 
            this.$delete(signedInUser.preferences.documentSyntaxTheme, openedFile.id);
          }
          gd.prefUnsetDocumentSyntaxTheme(openedFile.id);
        }
        updateSyntaxTheme();
      }
    },
    documentSyntaxTheme: {
      get: function () {
        if (signedInUser.preferences.documentSyntaxTheme && signedInUser.preferences.documentSyntaxTheme[openedFile.id]) {
          return signedInUser.preferences.documentSyntaxTheme[openedFile.id];
        } else {
          return this.savedDocumentSyntaxTheme;
        }
      },
      set: function (theme) {
        this.savedDocumentSyntaxTheme = theme;
        if (!signedInUser.preferences.documentSyntaxTheme) signedInUser.preferences.documentSyntaxTheme = {};
        this.$set(signedInUser.preferences.documentSyntaxTheme, openedFile.id, theme);
        gd.prefSetDocumentSyntaxTheme(openedFile.id, theme);
        updateSyntaxTheme();
      }
    },
    hasLocation: function () {
      return openedFile.id ? true : false;
    }
  },
  methods: {
    toggleModal: function () {
      if (!this.savedDocumentSyntaxTheme) {
        if (signedInUser.preferences.documentSyntaxTheme && signedInUser.preferences.documentSyntaxTheme[openedFile.id]) {
          this.documentSyntaxTheme = signedInUser.preferences.documentSyntaxTheme[openedFile.id];
        } else {
          this.savedDocumentSyntaxTheme = hltheme.theme;
        }
      }
      this.$el.classList.toggle("active");
    }
  }
});

var modalGuide = new Vue({
  el: "#modal-guide",
  data: {
    title: "Guide title",
    rawContent: "",
    mdTheme: "default"
  },
  computed: {
    compiledContent: function () {
      return mdconverter.makeHtml(this.rawContent)
    }
  },
  methods: {
    toggleModal: function () {
      this.$el.classList.toggle("active")
    }
  }
})

var modalFileExplorer = new Vue({
  el: "#modal-file-explorer",
  data: {
    options: fileExplorerOptions,
    list: [],
    folder: {
      name: "Folder name",
      id: ""
    },
    nextPageToken: "",
    loadingNextPage: false,
    selectedFile: null,
    loadingList: false,
    loadingFolder: false
  },
  computed: {
    title: function () {
      switch (this.options.type) {
        case this.options.TYPE.CREATENEW:
          return "Create new file";
        case this.options.TYPE.OPENFILE:
          return "Open file";
        case this.options.TYPE.SAVEAS:
          return "Save as";
      }
    },
    actionTitle: function () {
      switch (this.options.type) {
        case this.options.TYPE.CREATENEW:
          return "Save here";
        case this.options.TYPE.OPENFILE:
          return "Open";
        case this.options.TYPE.SAVEAS:
          return "Save here";
      }
    }
  },
  mounted: function () {
    this.$refs.fileList.addEventListener("scroll", (ev) => {
      if (this.$refs.fileList.scrollTop >= (this.$refs.fileList.scrollHeight - this.$refs.fileList.offsetHeight)) {
        if (!this.loadingNextPage && this.nextPageToken !== "") {
          this.loadingNextPage = true;
          gd.getChildren(this.folder.id, this.nextPageToken)
            .then((res) => {
              this.list.push(...res.result.files);
              if (res.result.nextPageToken) {
                this.nextPageToken = res.result.nextPageToken;
              } else {
                this.nextPageToken = "";
              }
              this.loadingNextPage = false;
            })
        }
      }
    })
  },
  methods: {
    toggleModal: function () {
      this.$el.classList.toggle("active");
      if (this.$el.classList.contains("active")) {
        if (openedFile.parents.length > 0) {
          this.updateFileExplorer(openedFile.parents[0]);
        } else {
          this.updateFileExplorer("root");
        }
      }
    },
    updateFileExplorer: function (folderId) {
      this.$el.querySelectorAll(".file-tile.selected").forEach((el) => {
        el.classList.remove("selected");
      });
      this.loadingFolder = true;
      gd.getFileMetadata(folderId)
        .then((res) => {
          this.folder = res.result;
          this.loadingFolder = false;
        });
      this.loadingList = true;
      gd.getChildren(folderId)
        .then((res) => {
          this.list = res.result.files;
          if (res.result.nextPageToken) {
            this.nextPageToken = res.result.nextPageToken;
          } else {
            this.nextPageToken = "";
          }
          this.loadingList = false;
        })
    },
    onClickFile: function (file, target) {
      this.$el.querySelectorAll(".file-tile.selected").forEach((el) => {
        el.classList.remove("selected");
      });
      this.$refs[target][0].classList.add("selected");
      if (file.mimeType.includes("vnd.google-apps.folder")) {
        this.selectedFile = null;
        this.updateFileExplorer(file.id);
      } else {
        if (this.options.type == this.options.TYPE.OPENFILE) {
          this.selectedFile = file;
        } else {
          
        }
      }
    },
    goUpALevel: function () {
      this.updateFileExplorer(this.folder.parents[0]);
    },
    clickAction: function () {
      if (this.options.type == this.options.TYPE.CREATENEW) {
        if (this.$refs.fileNameToSave.textContent) {
          this.$el.classList.remove("active");
          modalLoading.loadingText = "Creating file";
          modalLoading.activate = true;
          gd.createFile(this.folder.id, this.$refs.fileNameToSave.textContent, initialText)
            .then((res) => {
              if (res.status == 200) {
                modalLoading.loadingText = "Opening file";
                modalLoading.activate = true;
                gd.openFile(res.result.id);
              }
            });
        }
      } else if (this.options.type == this.options.TYPE.OPENFILE) {
        if (this.selectedFile) {
          this.$el.classList.remove("active");
          modalLoading.loadingText = "Opening file";
          modalLoading.activate = true;
          gd.openFile(this.selectedFile.id);
        }
      } else if(this.options.type == this.options.TYPE.SAVEAS) {
        if (this.$refs.fileNameToSave.textContent) {
          this.$el.classList.remove("active");
          modalLoading.loadingText = "Creating and saving file";
          modalLoading.activate = true;
          gd.createFile(this.folder.id, this.$refs.fileNameToSave.textContent, openedFile.raw)
            .then((res) => {
              if (res.status == 200) {
                modalLoading.loadingText = "Opening file";
                modalLoading.activate = true;
                gd.openFile(res.result.id);
              }
            });
        }
      }  
    }
  },
})

var contentContainer = {
  props: ["contenteditable", "wrapperId", "hideMd", "value", "contentTheme", "maximisable", "actions", "docOrPres", "currentSlide", "slidesName"],
  data: function () {
    return {
      height: 80,
      heightd: 3,
      heightmin: 30,
      wrapperClass: {
        "h-box": true,
        "grow": true,
        "p-1": true,
        "hide-md": this.hideMd
      },
      innerWrapperStyle: {}
    }
  },
  methods: {
    sendEditedContent: function (ev) {
      this.$emit("input", ev.target.value)
    },
    addTab: function (e) {
      e.preventDefault()
      this.$emit("addtab", this.$refs.textarea)
    },
    boldText: function (e) {
      e.preventDefault()
      this.$emit("boldtext", this.$refs.textarea)
    },
    italicText: function (e) {
      e.preventDefault()
      this.$emit("italictext", this.$refs.textarea)
    },
    toggleDistractFree: function () {
      if (Object.keys(this.innerWrapperStyle).length == 0)
        this.innerWrapperStyle = {
          position: "absolute",
          width: "100%",
          height: "100%",
          "z-index": "10",
          left: 0,
          top: 0,
          border: "0px"
        };
      else this.innerWrapperStyle = {};
    },
    toggleFullscreen: function () {
      let el;
      if (this.contenteditable) {
        el = this.$refs.textarea;
      } else if (this.docOrPres == 0) {
        el = this.$refs.docDisplay;
      } else {
        this.$emit("toggle-presentation");
      }
      if (el) {
        if (el.requestFullscreen) {
          el.requestFullscreen();
        } else if (el.mozRequestFullScreen) {
          el.mozRequestFullScreen();
        } else if (el.webkitRequestFullScreen) {
          el.webkitRequestFullScreen();
        } else if (el.msRequestFullscreen) {
          el.msRequestFullscreen();
        }
      }
    },
    emitAction: function () {
      this.$emit("action");
    },
    customEmit: function (msg) {
      this.$emit(msg);
    },
  },
  template: `
  <span :id="wrapperId" :class="wrapperClass">
    <div :class="['actual', 'grow', 'relative', 'md-'+contentTheme, 'v-box']" ref="innerWrapper" :style="innerWrapperStyle">
      <textarea v-if="contenteditable" class="p-1 grow" ref="textarea" 
        :value="value" 
        @input="sendEditedContent" 
        @keydown.tab="addTab"
        @keyup.ctrl.66.exact="boldText"
        @keydown.ctrl.66.exact="e => e.preventDefault()"
        @keyup.ctrl.73.exact="italicText"
        @keydown.ctrl.73.exact="e => e.preventDefault()">
      </textarea>
      <div v-else-if="docOrPres == 0" v-html="value" class="p-1 grow content-display" style="overflow-y: scroll; background-color: white;" ref="docDisplay">
      </div>
      <div v-else class="presentation-wrapper grow relative" 
        @wheel.prevent="$emit('p-wh', $event.deltaY)"
      >
        <div class="presentation-display"></div>
      </div>
      <div class="h-box px-2 v-center controls">
        <template v-if="!contenteditable && docOrPres == 1">
          <div class="mdi mdi-triangle mdi-rotate-270 c-hand" @click="$emit('previous-slide')"></div>
          <div class="h-box v-center px-1">
            <select class="form-select select-sm" :value="currentSlide" @change="$emit('change-slide', $event.target.value)">
              <option v-for="(n, idx) in slidesName" :value="idx+1">{{ idx+1 }}{{ n ? ': ' + n : '' }}</option>
            </select>
            <span>&nbsp;of&nbsp;{{ slidesName.length }}</span>
          </div>
          <div class="mdi mdi-triangle mdi-rotate-90 c-hand" @click="$emit('next-slide')"></div>
        </template>
        <div class="grow"></div>
        <div v-for="a in actions" :class="['mdi', 'mdi-24px', 'c-hand'].concat(a.class).concat(a.tooltip ? ['tooltip', 'tooltip-left'] : '')" @click="$emit(a.emit)"
          :data-tooltip="a.tooltip ? a.tooltip : ''"
        ></div>
      </div>
    </div>
  </span>
  `
}

var content = new Vue({
  el: "#content",
  data: {
    openedFile: openedFile,
    docOrPres: 0,
    slideshow: null,
    currentSlideNumber: 0,
    slidesName: [],
    distractFree: {
      editor: false,
      display: false
    }
  },
  computed: {
    compiledDoc: function () {
      if (this.docOrPres == 0) {
        return mdconverter.makeHtml(this.openedFile.raw);
      } else {
        this.$nextTick(() => {
          let slideIdx;
          if (this.slideshow !== null) {
            slideIdx = this.slideshow.getCurrentSlideIndex();
          }
          let outer = document.querySelector("#display-wrapper .presentation-display");
          while (outer.firstChild) outer.removeChild(outer.firstChild);
          outer.classList.remove("remark-container");
          this.slideshow = remark.create({
            container: outer,
            source: this.openedFile.raw,
            converter: mdconverter,
            externalHighlighter: true
          });
          this.slidesName = this.slideshow.getSlides().map(s => s.properties.name);

          function addCallback(ss, eventName, callback) {
            let orig = ss.events._events[eventName];
            if (orig) {
              ss.events._events[eventName] = () => {
                if (Array.isArray(orig)) {
                  orig.forEach(f => { f(); });
                } else {
                  orig();
                }
                callback();
              }
            }
          }

          addCallback(this.slideshow, "slidesChanged", () => {
            this.currentSlideNumber = this.slideshow.getCurrentSlideIndex() + 1;
          });
          addCallback(this.slideshow, "createClone", () => {
            let clone = this.slideshow.clone;
            clone.presentationView = true;
          })
          
          if (slideIdx) { this.slideshow.gotoSlideNumber(this.slideshow.getSlides()[slideIdx].getSlideNumber()); }
          this.currentSlideNumber = this.slideshow.getCurrentSlideIndex() + 1;
        })
        return this.openedFile.raw;
      }
    },
    editorActions: function () {
      let actions = [];
      actions = actions.concat([{
        class: this.distractFree.editor ? ['mdi-arrow-collapse'] : ['mdi-arrow-expand'],
        emit: 'toggle-distract-free',
        tooltip: "toggle distraction free"
      }, {
        class: ['mdi-fullscreen'],
        emit: "toggle-fullscreen",
        tooltip: "toggle fullscreen"
      }]);
      if (!presentationView) {
        return actions.concat([{
          class: ['mdi-eye', 'show-md'], 
          emit: 'toggle-view' 
        }]);
      } else {
        return actions;
      }
    },
    displayActions: function () {
      let actions = [];
      if (!presentationView) {
        actions.push({
          class: this.distractFree.display ? ['mdi-arrow-collapse'] : ['mdi-arrow-expand'],
          emit: 'toggle-distract-free',
          tooltip: "toggle distraction free"
        });
      }
      actions.push({
        class: ['mdi-fullscreen'],
        emit: 'toggle-fullscreen',
        tooltip: "toggle fullscreen"
      });
      if (this.docOrPres == 1) {
        actions = actions.concat([{
          class: ["mdi-file-presentation-box"],
          emit: "toggle-presenter-mode",
          tooltip: "toggle presenter mode (p)"
        }, {
          class: ["mdi-content-duplicate"],
          emit: "clone-presentation",
          tooltip: "clone presentation (c)"
        }]);
      }
      if (!presentationView) {
        actions = actions.concat([{ 
          class: [ this.docOrPres == 0 ? 'mdi-file-document' : 'mdi-file-powerpoint'],
          emit: "toggle-render",
          tooltip: "render as document/slides"
        }, { 
          class: ['mdi-lead-pencil', 'show-md'], 
          emit: 'toggle-view' 
        }]);
      }
      return actions;
    }
  },
  components: {
    "content-container": contentContainer
  },
  mounted: function () {
    this.$nextTick(() => {
      updateSplit(window);
      window.addEventListener("resize", (ev) => {
        updateSplit(ev.currentTarget);
      });
      window.addEventListener("message", (msg) => { 
        if (this.slideshow !== null) this.slideshow.events.emit("message", msg);
      }, false);
    })
  },
  methods: {
    switchTo: function (target) {
      let allChildren = document.querySelector("#content #actual-content").children
      for (let i = 0; i < allChildren.length; i++) {
        if (allChildren[i].id == target) allChildren[i].classList.remove("hide-md")
        else allChildren[i].classList.add("hide-md")
      }
      if (this.slideshow !== null) this.slideshow.events.emit("resize");
    },
    toggleRender: function () {
      this.docOrPres = (this.docOrPres + 1) % 2;
      if (this.docOrPres == 0) {
        gd.prefUnsetRenderAsPresentation(this.openedFile.id);
      } else {
        gd.prefSetRenderAsPresentation(this.openedFile.id);
      }
    },
    wheelEventHandler: function (deltaY) {
      if (deltaY > 0) {
        this.slideshow.gotoNextSlide();
      } else if (deltaY < 0) {
        this.slideshow.gotoPreviousSlide();        
      }
    },
    toggleDistractFree: function (role) {
      this.$refs[role + "Wrapper"].toggleDistractFree();
      this.distractFree[role] = !this.distractFree[role];
      this.$nextTick(() => {
        if (this.slideshow !== null) {
          this.slideshow.events.emit("resize");
        }
      });
    },
    addTab: function (ta) {
      let tStart = ta.selectionStart, 
          tEnd = ta.selectionEnd;
      this.openedFile.raw = this.openedFile.raw.slice(0, tStart) + "    " + this.openedFile.raw.slice(tEnd);
      this.$nextTick(() => {
        ta.selectionStart = tStart + 4;
        ta.selectionEnd = tStart + 4;
      });
    },
    boldText: function (ta) {
      let tStart = ta.selectionStart, 
          tEnd = ta.selectionEnd;
      this.openedFile.raw = this.openedFile.raw.slice(0, tStart) + "**" + this.openedFile.raw.slice(tStart, tEnd) + "**" + this.openedFile.raw.slice(tEnd);
      this.$nextTick(() => {
        ta.selectionStart = tStart + 2;
        ta.selectionEnd = tEnd + 2;
      });
    },
    italicText: function (ta) {
      let tStart = ta.selectionStart, 
          tEnd = ta.selectionEnd;
      this.openedFile.raw = this.openedFile.raw.slice(0, tStart) + "*" + this.openedFile.raw.slice(tStart, tEnd) + "*" + this.openedFile.raw.slice(tEnd);
      this.$nextTick(() => {
        ta.selectionStart = tStart + 1;
        ta.selectionEnd = tEnd + 1;
      });
    }
  }
})

// initiation
function initApis() {
  modalLoading.loadingText = "Loading API";
  modalLoading.activate = true;
  gd = new GDrive();
  gd.signedInFunction = () => {
    signedInStatus.google = true;
    let gUser = gd.getUserProfile();
    signedInUser.name = gUser.getName();
    signedInUser.email = gUser.getEmail();
    signedInUser.profilePic = gUser.getImageUrl();
    // if no user is provided on url
    if (urlParams.get("user")) {
      // check if the signed in user is the same user
      if (gUser.getId() == urlParams.get("user")) {
        // open file if action is open
        if (urlParams.get("action") == "open") {
          if (urlParams.get("file")) {
            modalLoading.loadingText = "Opening file";
            modalLoading.activate = true;
            gd.getFileMetadata(urlParams.get("file")).then((res) => {
              gd.getFileContent(res.result.id).then((res) => {
                openedFile.raw = res.body;
                openedFile.saved = res.body;
                modalLoading.activate = false;
              });
              openedFile.name = res.result.name;
              openedFile.id = res.result.id;
              openedFile.paths = [];
              openedFile.parents = res.result.parents;
              openedFile.canEdit = res.result.capabilities.canEdit;

              if (!openedFile.canEdit) {
                notiObj.notify("This file is not editable.", "error");
              }
  
              async function findParents(currentPath, currentPathInName, parents) {
                if (!parents) {
                  openedFile.paths.push(currentPath);
                  openedFile.pathsInName.push(currentPathInName);
                  // console.log(openedFile.paths, openedFile.pathsInName);
                } else {
                  for (let i = 0; i < parents.length; i++) {
                    gd.getFileMetadata(parents[i]).then((res) => {
                      findParents(currentPath.concat(res.result.id), currentPathInName.concat(res.result.name), res.result.parents);
                    })
                  }
                }
              }
              findParents([res.result.id], [res.result.name], res.result.parents);
            });  
          }
        } else {  // if action is create
          if (urlParams.get("folder")) {
            modalLoading.loadingText = "Creating file";
            modalLoading.activate = true;
            gd.createFile(urlParams.get("folder"), "Untitled.md", initialText)
              .then((res) => {
                if (res.status == 200) {
                  gd.openFile(res.result.id);
                  modalLoading.activate = false;
                }
              });
          }
        }
        gd.getPreferences().then(pref => {
          signedInUser.preferences = pref;
          if (pref.renderAsPresentation && pref.renderAsPresentation.includes(openedFile.id)) {
            renderAsSlides();
          }
          updateSyntaxTheme();
        });
      } else {
        notiObj.notify(`The signed in user is not the same as the user who opened this page. You can solve this by
          (1) signing out and signing in as the user who opened this page, or
          (2) opening a file or creating a new file from this page as the signed in user.
        `, "error");
        modalLoading.activate = false;
      }
    } else { // no user id on url, assuming not landing from google drive using create new or open with
      modalLoading.activate = false;
    }
  }
  gd.signedOutFunction = () => {
    signedInStatus.google = false;
    modalLoading.activate = false;
  }
  gd.signedInAtInit = () => {
    document.querySelector("#modal-user").classList.remove("active");
  }
  gd.signedOutAtInit = () => {
    document.querySelector("#modal-user").classList.add("active");
  }
}

// open modal-user to prompt user to sign in
// document.querySelector("#modal-user").classList.add("active");
// console.log(urlParams.get("user"), urlParams.get("file"), urlParams.get("action"));

function switchToDisplay() {
  content.switchTo("display-wrapper");
}

function renderAsSlides() {
  content.docOrPres = 1;
}

function showDisplayOnly() {
  content.toggleDistractFree("display");
}

window.addEventListener("load", () => {
  if (presentationView) {
    console.log("load");
    window.switchToDisplay();
    window.renderAsSlides();
    window.showDisplayOnly();
    window.addEventListener("keypress", (ev) => {
      if (ev.ctrlKey && !ev.shiftKey && !ev.altKey && !ev.metaKey && !ev.repeat && ev.key == "r") {
        gd.signedInFunction();
        ev.preventDefault();
      }
    });
  }
}, true);

hltheme.getAllHlthemes();
updateSyntaxTheme();

var jsForHtml;
compileJsForHtml();

function compileJsForHtml() {
  let filesToFetch = [
    "js/remark.min.js",
    "js/highlight.pack.js",
    "js/showdown.min.js",
    "js/showdown-highlightjs-ext.js",
    "js/showdown-timeline-ext.js",
    "js/md-converter.js"
  ]
  Promise.all(filesToFetch.map(f => fetch(new Request(f)))).then(res => 
    Promise.all(res.map(r => r.text()))
  ).then(t => {
    jsForHtml = t.map(x => x.replace("</script>", "</scr\"+\"ipt>")).join("\n")
  });
}