(function (window) {
  function GDrive () {
    this.clientId = "623667008977-hsdjgfsve1cj8m19traqm3hshh8o995s.apps.googleusercontent.com";
    this.apiKey = "AIzaSyDMQVW72MRoWlANqcx0CjbFzeIKisRuAhc";
    this.appId = "623667008977";
    this.discoveryDocs = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
    this.scopes = [
      "https://www.googleapis.com/auth/drive.install",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.readonly"
    ].join(" ");
    this.initialised = false;
    this.initialising = false;
    this.signedIn = false;

    this.init = () => {
      this.initialising = true;
      gapi.load('client:auth2', this.initClient);
    }

    this.initClient = () => {
      gapi.client.init({
        apiKey: this.apiKey,
        clientId: this.clientId,
        discoveryDocs: this.discoveryDocs,
        scope: this.scopes
      }).then(() => {
        this.initialised = true;
        this.initialising = false;
        if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
          this.signedIn = true;
          this.signedInAtInit();
        } else {
          this.signedOutAtInit();
        }
        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSigninStatus);
        // Handle the initial sign-in state.
        this.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
      });
    }
    this.updateSigninStatus = (signedIn) => {
      console.log("signed in status (Google): ", signedIn);
      if (signedIn) {
        this.signedIn = true;
        this.signedInFunction();
      } else {
        this.signedIn = false;
        this.signedOutFunction();
      }
    }

    this.signedInFunction = () => {}
    this.signedOutFunction = () => {}
    this.signedInAtInit = () => {}
    this.signedOutAtInit = () => {}

    this.handleSignInClick = () => {
      gapi.auth2.getAuthInstance().signIn();
    }

    this.handleSignOutClick = () => {
      gapi.auth2.getAuthInstance().signOut();
    }

    this.getUserProfile = () => {
      if (this.signedIn) {
        return gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();
      } else {
        return "";
      }
    }

    this.getFileMetadata = (fileId) => {
      if (this.signedIn) {
        return gapi.client.drive.files.get({
          fileId: fileId,
          fields: "parents, name, id, capabilities"
        });
      } else {
        return null;
      }
    }

    this.getChildren = (fileId, nextPageToken) => {
      if (this.signedIn) {
        let config = {
          orderBy: "folder,name",
          q: "'" + fileId + "' in parents" 
            + " and ("
            + "(mimeType = 'application/vnd.google-apps.folder' or mimeType = 'text/plain' or mimeType = 'text/markdown')"
            + " or (name contains '.md' and not name contains '.md.html')"
            + ")"
        };
        if (nextPageToken) {
          config.pageToken = nextPageToken;
        }
        return gapi.client.drive.files.list(config);
      } else {
        return null;
      }
    }

    this.createFile = (folderId, filename, fileContent) => {
      if (this.signedIn) {
        return gapi.client.request({
          path: "/upload/drive/v3/files",
          method: "POST",
          params: {
            uploadType: "multipart"
          },
          headers: {
            "Content-Type": "multipart/related; boundary=bounding"
          },
          body: "--bounding\n"
            + "Content-Type: application/json; charset=UTF-8\n\n"
            + JSON.stringify({
                mimeType: "text/markdown",
                name: filename.endsWith(".md") ? filename : filename + ".md",
                parents: [folderId]
              })
            + "\n\n"
            + "--bounding\n"
            + "Content-Type: text/markdown\n\n"
            + fileContent + "\n\n"
            + "--bounding--"
        })
      }
    }

    this.openFile = (fileId) => {
      if (this.signedIn) {
        let url = new URL(window.location);
        url.searchParams.set("action", "open");
        url.searchParams.set("user", this.getUserProfile().getId());
        url.searchParams.set("file", fileId);
        window.location = url.toString();
      }
    }

    this.getFileContent = (fileId) => {
      if (this.signedIn) {
        return gapi.client.drive.files.get({
          fileId: fileId,
          alt: "media"
        });
      } else {
        return null;
      }
    }

    this.updateFileContent = (fileId, newContent) => {
      if (this.signedIn) {
        return gapi.client.request({
          path: "/upload/drive/v3/files/" + fileId,
          method: "PATCH",
          params: {
            uploadType: "media"
          },
          body: newContent
        })
      } else {
        return null;
      }
    }

    this.saveFileAsHtml = (folderId, fileName, content) => {
      if (this.signedIn) {
        let htmlfilename = fileName + ".html";
        return gapi.client.request({
          path: "/upload/drive/v3/files",
          method: "POST",
          params: {
            uploadType: "multipart"
          },
          headers: {
            "Content-Type": "multipart/related; boundary=bounding"
          },
          body: "--bounding\n"
            + "Content-Type: application/json; charset=UTF-8\n\n"
            + JSON.stringify({
                mimeType: "text/html",
                name: htmlfilename,
                parents: [folderId]
              })
            + "\n\n"
            + "--bounding\n"
            + "Content-Type: text/html\n\n"
            + content + "\n\n"
            + "--bounding--"
        });
      }
    }

    this.init();
  }

  if(typeof(window.GDrive) === 'undefined'){
    window.GDrive = GDrive;
  }


})(window)