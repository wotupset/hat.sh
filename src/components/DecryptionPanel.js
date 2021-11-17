/* eslint-disable @next/next/no-img-element */
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useDropzone } from "react-dropzone";
import { formatBytes } from "../helpers/formatBytes";
import { formatName } from "../helpers/formatName";
import { formatUrl } from "../helpers/formatUrl";
import {
  crypto_secretstream_xchacha20poly1305_ABYTES,
  CHUNK_SIZE,
} from "../config/Constants";
import { Alert, AlertTitle } from "@material-ui/lab";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Stepper from "@material-ui/core/Stepper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import StepContent from "@material-ui/core/StepContent";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";
import TextField from "@material-ui/core/TextField";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";
import Backdrop from "@material-ui/core/Backdrop";
import Collapse from "@material-ui/core/Collapse";
import LockOpenIcon from "@material-ui/icons/LockOpen";
import RefreshIcon from "@material-ui/icons/Refresh";
import DescriptionIcon from "@material-ui/icons/Description";
import GetAppIcon from "@material-ui/icons/GetApp";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import CloseIcon from "@material-ui/icons/Close";
import { getTranslations as t } from "../../locales";
import { List, ListItem, ListItemSecondaryAction,ListItemText } from "@material-ui/core";
import DeleteIcon from '@material-ui/icons/Delete';

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
  },
  stepper: {
    backgroundColor: "transparent",
  },

  stepIcon: {
    "&$activeStepIcon": {
      color: theme.palette.emperor.main,
    },
    "&$completedStepIcon": {
      color: theme.palette.emperor.main,
    },
  },
  activeStepIcon: {},
  completedStepIcon: {},

  button: {
    marginTop: theme.spacing(1),
    marginRight: theme.spacing(1),
    borderRadius: "8px",
    border: "none",
    color: theme.palette.mineShaft.main,
    backgroundColor: theme.palette.mercury.light,
    "&:hover": {
      backgroundColor: theme.palette.mercury.main,
    },
    transition: "background-color 0.2s ease-out",
  },

  browseButton: {
    padding: 8,
    paddingLeft: 15,
    paddingRight: 15,
    textTransform: "none",
    borderRadius: "8px",
    border: "none",
    color: theme.palette.mineShaft.main,
    backgroundColor: theme.palette.alto.light,
    "&:hover": {
      backgroundColor: theme.palette.alto.main,
    },
    transition: "background-color 0.2s ease-out",
    transition: "color .01s",
  },

  backButton: {
    marginTop: theme.spacing(1),
    marginRight: theme.spacing(1),
    borderRadius: "8px",
    backgroundColor: theme.palette.mercury.main,
  },
  nextButton: {
    marginTop: theme.spacing(1),
    marginRight: theme.spacing(1),
    borderRadius: "8px",
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.white.main,
    "&:hover": {
      backgroundColor: theme.palette.mineShaft.main,
    },
    transition: "color .01s",
  },

  actionsContainer: {
    marginBottom: theme.spacing(2),
  },
  resetContainer: {
    padding: theme.spacing(3),
    boxShadow: "rgba(149, 157, 165, 0.4) 0px 8px 24px",
    borderRadius: "8px",
  },

  input: {
    display: "none",
  },

  textFieldLabel: {
    // this will be applied when input focused (label color change)
    "&$textFieldLabelFocused": {
      color: theme.palette.emperor.main,
    },
  },
  textFieldLabelFocused: {},

  textFieldRoot: {
    // this will be applied when hovered (input text color change)
    "&:hover": {
      color: theme.palette.emperor.main,
    },
    // this will applied when hovered (input border color change)
    "&:hover $textFieldNotchedOutline": {
      borderColor: theme.palette.emperor.main,
    },
    // this will be applied when focused (input border color change)
    "&$textFieldFocused $textFieldNotchedOutline": {
      borderColor: theme.palette.emperor.main,
    },
  },
  textFieldFocused: {},
  textFieldNotchedOutline: {},

  fileArea: {
    padding: "20px",
    border: "5px dashed",
    borderColor: theme.palette.gallery.main,
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    marginBottom: "10px",
  },
  
}));

let file, index, decFileBuff, files=[], password, currFile = 0, numberOfFiles, decryptionMethodState, privateKey, publicKey;

export default function DecryptionPanel() {
  const classes = useStyles();

  const router = useRouter();

  const query = router.query;

  const [activeStep, setActiveStep] = useState(0);

  const [Files, setFiles] = useState([]);

  const [currFileState, setCurrFileState] = useState(0);

  const [Password, setPassword] = useState();

  const [decryptionMethod, setDecryptionMethod] = useState("secretKey");

  const [PublicKey, setPublicKey] = useState();

  const [PrivateKey, setPrivateKey] = useState();

  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const [wrongPublicKey, setWrongPublicKey] = useState(false);

  const [wrongPrivateKey, setWrongPrivateKey] = useState(false);

  const [keysError, setKeysError] = useState(false);

  const [keysErrorMessage, setKeysErrorMessage] = useState();

  const [badFile, setbadFile] = useState();

  const [oldVersion, setOldVersion] = useState();

  const [fileMixUp, setFileMixUp] = useState(false);

  const [wrongPassword, setWrongPassword] = useState(false);

  const [isCheckingFile, setIsCheckingFile] = useState(false);

  const [isTestingPassword, setIsTestingPassword] = useState(false);

  const [isTestingKeys, setIsTestingKeys] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [isDownloading, setIsDownloading] = useState(false);

  const [pkAlert, setPkAlert] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      handleFilesInput(acceptedFiles);
    },
    noClick: true,
    noKeyboard: true,
    disabled: activeStep !== 0,
  });

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setWrongPassword(false);
    setWrongPublicKey(false);
    setWrongPrivateKey(false);
    setKeysError(false);
    setIsTestingKeys(false);
    setIsTestingPassword(false);
  };

  const handleReset = () => {
    setActiveStep(0);
    setFiles([]);
    setPassword();
    setWrongPassword(false);
    setbadFile(false);
    setOldVersion(false);
    setFileMixUp(false);
    setPublicKey();
    setPrivateKey();
    privateKey = null;
    publicKey = null;
    setWrongPublicKey(false);
    setWrongPrivateKey(false);
    setKeysError(false);
    setPkAlert(false);
    file = null;
    index = null;
    files = [];
    numberOfFiles = 0;
    resetCurrFile()
    router.replace(router.pathname);
  };

  const resetCurrFile = () => {
    currFile = 0
    setCurrFileState(currFile)
  }

  const updateCurrFile = () => {
    currFile += 1;
    setCurrFileState(currFile)
    
  }

  const handleFilesInput = (selectedFiles) => {
    selectedFiles = Array.from(selectedFiles)
    if(files.length>0) {
      files = files.concat(selectedFiles)
      files = files.filter((thing, index, self) =>
        index === self.findIndex((t) => (
          t.name === thing.name && t.size === thing.size
        ))
      )
    } else {
      files = selectedFiles;
    }
    setFiles(files)
    console.log(files)
    setbadFile(false);
    setOldVersion(false);
    setFileMixUp(false);
    resetCurrFile()
    decryptionMethodState = null;
  };

  const updateFilesInput = (index) => {
    files = [
      ...files.slice(0, index),
      ...files.slice(index + 1)
    ];
    setFiles(files)
    console.log(files)
    setbadFile(false);
    setOldVersion(false);
    setFileMixUp(false);
    resetCurrFile()
    decryptionMethodState = null;
  }

  const handlePasswordInput = (selectedPassword) => {
    setPassword(selectedPassword);
    password = selectedPassword;
  };

  const checkFile = (file) => {
    navigator.serviceWorker.ready.then((reg) => {
      setIsCheckingFile(true);
      setbadFile(false);
      setOldVersion(false);
      setFileMixUp(false);

      console.log(file)

      Promise.all([
        file.slice(0, 11).arrayBuffer(), //signatures
        file.slice(0, 22).arrayBuffer(), //v1 signature
      ]).then(([signature, legacy]) => {
        reg.active.postMessage({
          cmd: "checkFile",
          signature,
          legacy,
        });
      });
    });
  };

  const checkFiles = () => {
    numberOfFiles = files.length;
    if (currFile <= numberOfFiles - 1) {
      console.log(files)
      console.log(`checking file ${currFile+1}/${numberOfFiles}`)
      console.log(files[currFile])
      checkFile(files[currFile]);
    }

  }

  const checkFilesQueue = () => {
    
    if (numberOfFiles > 1) {
      updateCurrFile();

      if(currFile <= numberOfFiles - 1){
        checkFiles();
      }else {
        setActiveStep(1);
        setIsCheckingFile(false);
        resetCurrFile()
        console.log("all files were successfully checked!")
        console.log(decryptionMethodState)
      }
    } 

  }

  const checkFileMixUp = () => {
    setFileMixUp(true);
    setIsCheckingFile(false);
  }

  

  const checkFilesTestQueue = () => {
    if (numberOfFiles > 1) {
      updateCurrFile();

      if(currFile <= numberOfFiles - 1){
        testFilesDecryption();
      }else {
        setIsTestingKeys(false);
        setIsTestingPassword(false);
        handleNext();
        resetCurrFile()
        console.log("all files were successfully tested!")
      }
    } 

  }

  const testFilesDecryption = () => {
    numberOfFiles = files.length;
    if (currFile <= numberOfFiles - 1) {
      console.log(files)
      console.log(`testing file ${currFile+1}/${numberOfFiles}`)
      console.log(files[currFile])
      testDecryption(files[currFile]);
    }

  }

  const testDecryption = (file) => {

    console.log(currFile)

    if (decryptionMethodState === "secretKey") {
      navigator.serviceWorker.ready.then((reg) => {
        setIsTestingPassword(true);
        setWrongPassword(false)

        Promise.all([
          file.slice(0, 11).arrayBuffer(), //signature
          file.slice(11, 27).arrayBuffer(), //salt
          file.slice(27, 51).arrayBuffer(), //header
          file
            .slice(
              51,
              51 + CHUNK_SIZE + crypto_secretstream_xchacha20poly1305_ABYTES
            )
            .arrayBuffer(), //17
        ]).then(([signature, salt, header, chunk]) => {
          decFileBuff = chunk; //for testing the dec password
          reg.active.postMessage({
            cmd: "requestTestDecryption",
            password,
            signature,
            salt,
            header,
            decFileBuff,
          });
        });
      });
    }

    if (decryptionMethodState === "publicKey") {
      navigator.serviceWorker.ready.then((reg) => {
        setIsTestingKeys(true);
        setKeysError(false);
        setWrongPrivateKey(false)
        setWrongPublicKey(false)

        console.log(decryptionMethodState)
        console.log(privateKey)
        console.log(publicKey)

        let mode = "test";

        Promise.all([
          file.slice(11, 35).arrayBuffer(), //header
          file
            .slice(
              35,
              35 + CHUNK_SIZE + crypto_secretstream_xchacha20poly1305_ABYTES
            )
            .arrayBuffer(), //17
        ]).then(([header, chunk]) => {
          decFileBuff = chunk;
          reg.active.postMessage({
            cmd: "requestDecKeyPair",
            privateKey,
            publicKey,
            header,
            decFileBuff,
            mode,
          });
        });
      });
    }
  };

  const handlePublicKeyInput = (selectedKey) => {
    setPublicKey(selectedKey);
    publicKey = selectedKey;
    setWrongPublicKey(false);
  };

  const loadPublicKey = (file) => {
    if (file) {
      // files must be of text and size below 1 mb
      if (file.size <= 1000000) {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
          setPublicKey(reader.result);
          publicKey = reader.result;
        };
      }
    }
  };

  const handlePrivateKeyInput = (selectedKey) => {
    setPrivateKey(selectedKey);
    privateKey = selectedKey;
    setWrongPrivateKey(false);
  };

  const loadPrivateKey = (file) => {
    if (file) {
      // files must be of text and size below 1 mb
      if (file.size <= 1000000) {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
          setPrivateKey(reader.result);
          privateKey = reader.result;
        };
      }
    }
  };

  const handleEncryptedFilesDownload = async (e) => {
    numberOfFiles = Files.length;
    kickOffDecryption()
  };

  const kickOffDecryption = async (e) => {

    if (currFile <= numberOfFiles - 1) {

      file = files[currFile];

      let fileName = formatName(file.name);
      let safeUrl = await formatUrl(fileName);
      window.open(`file?name=${safeUrl}`, "_self");
      setIsDownloading(true);
  
      console.log(safeUrl)
  
      console.log(decryptionMethodState)
  
      if (decryptionMethodState === "secretKey") {
        navigator.serviceWorker.ready.then((reg) => {
          Promise.all([
            file.slice(0, 11).arrayBuffer(), //signature
            file.slice(11, 27).arrayBuffer(), //salt
            file.slice(27, 51).arrayBuffer(), //header
            file
              .slice(
                51,
                51 + CHUNK_SIZE + crypto_secretstream_xchacha20poly1305_ABYTES
              )
              .arrayBuffer(), //17
          ]).then(([signature, salt, header, chunk]) => {
            reg.active.postMessage({
              cmd: "requestDecryption",
              password,
              signature,
              salt,
              header,
            });
          });
        });
      }
  
      if (decryptionMethodState === "publicKey") {
        navigator.serviceWorker.ready.then((reg) => {
          let mode = "derive";
  
          Promise.all([
            file.slice(11, 35).arrayBuffer(), //header
            file
              .slice(
                35,
                35 + CHUNK_SIZE + crypto_secretstream_xchacha20poly1305_ABYTES
              )
              .arrayBuffer(), //17
          ]).then(([header, chunk]) => {
            decFileBuff = chunk;
            reg.active.postMessage({
              cmd: "requestDecKeyPair",
              privateKey,
              publicKey,
              header,
              decFileBuff,
              mode,
            });
          });
        });
      }


    } else {
      console.log("out of files")
    }

  };

  const startDecryption = (method) => {
    let startIndex;
    if (method === "secretKey") startIndex = 51;
    if (method === "publicKey") startIndex = 35;

    file = files[currFile];

    navigator.serviceWorker.ready.then((reg) => {
      file
        .slice(
          startIndex,
          startIndex + CHUNK_SIZE + crypto_secretstream_xchacha20poly1305_ABYTES
        )
        .arrayBuffer()
        .then((chunk) => {
          index =
            startIndex +
            CHUNK_SIZE +
            crypto_secretstream_xchacha20poly1305_ABYTES;
          reg.active.postMessage(
            { cmd: "decryptFirstChunk", chunk, last: index >= file.size },
            [chunk]
          ); // transfer chunk ArrayBuffer to service worker
        });
    });
  };

  const continueDecryption = (e) => {

    file = files[currFile];

    navigator.serviceWorker.ready.then((reg) => {
      file
        .slice(
          index,
          index + CHUNK_SIZE + crypto_secretstream_xchacha20poly1305_ABYTES
        )
        .arrayBuffer()
        .then((chunk) => {
          index += CHUNK_SIZE + crypto_secretstream_xchacha20poly1305_ABYTES;
          e.source.postMessage(
            { cmd: "decryptRestOfChunks", chunk, last: index >= file.size },
            [chunk]
          );
        });
    });
  };

  useEffect(() => {
    if (query.tab === "decryption" && query.publicKey) {
      setPublicKey(query.publicKey);
      setPkAlert(true);
      setDecryptionMethod("publicKey");
      decryptionMethodState = "publicKey";
    }
  }, [query.publicKey, query.tab]);

  useEffect(() => {
    navigator.serviceWorker.addEventListener("message", (e) => {
      switch (e.data.reply) {
        case "badFile":
          if (numberOfFiles > 1) {
            setbadFile(files[currFile].name);
            setIsCheckingFile(false);
          } else {
            setbadFile(true);
            setIsCheckingFile(false);
          }
          break;

        case "oldVersion":
          if (numberOfFiles > 1) {
            setOldVersion(files[currFile].name)
            setIsCheckingFile(false);
          } else {
            setOldVersion(true);
            setIsCheckingFile(false);
          }
          break;

        case "secretKeyEncryption":
          console.log(`${files[currFile].name} was checked successfully`)
          if (numberOfFiles > 1) {
            if(decryptionMethodState && decryptionMethodState !== "secretKey") {
              checkFileMixUp()
              return
            }else{
              decryptionMethodState = "secretKey";
              setDecryptionMethod("secretKey");
              checkFilesQueue();
            }
            
          } else {
            setDecryptionMethod("secretKey");
            decryptionMethodState = "secretKey";
            setActiveStep(1);
            setIsCheckingFile(false);
            resetCurrFile()
          }
        break;

        case "publicKeyEncryption":
          console.log(`${files[currFile].name} was checked successfully`)
          if (numberOfFiles > 1) {
            if(decryptionMethodState && decryptionMethodState !== "publicKey") {
              checkFileMixUp()
              return
            }else {
              decryptionMethodState = "publicKey";
              setDecryptionMethod("publicKey");
              checkFilesQueue();
            }
            
          } else {
            setDecryptionMethod("publicKey");
            decryptionMethodState = "publicKey";
            setActiveStep(1);
            setIsCheckingFile(false);
            resetCurrFile()
          }
        break;

        case "wrongDecPrivateKey":
          setWrongPrivateKey(true);
          setIsTestingKeys(false);
          break;

        case "wrongDecPublicKey":
          setWrongPublicKey(true);
          setIsTestingKeys(false);
          break;

        case "wrongDecKeys":
          setWrongPublicKey(true);
          setWrongPrivateKey(true);
          setIsTestingKeys(false);
          break;

        case "wrongDecKeyPair":
          setKeysError(true);
          setKeysErrorMessage(
            t('invalid_key_pair')
          );
          setIsTestingKeys(false);
          break;

        case "wrongDecKeyInput":
          setKeysError(true);
          setKeysErrorMessage(t('invalid_keys_input'));
          setIsTestingKeys(false);
          break;

        case "wrongPassword":
          setWrongPassword(true);
          setIsTestingPassword(false);
          break;

        case "readyToDecrypt":
          if (numberOfFiles > 1) {
            checkFilesTestQueue();
          } else {
            setIsTestingKeys(false);
            setIsTestingPassword(false);
            handleNext();
            resetCurrFile()
          }
          break;

        case "decKeyPairGenerated":
          startDecryption("publicKey");
          break;

        case "decKeysGenerated":
          startDecryption("secretKey");
          break;

        case "continueDecryption":
          continueDecryption(e);
          break;

        case "decryptionFinished":
          if (numberOfFiles > 1) {
            updateCurrFile()
            file = null;
            index = null;
            if(currFile <= numberOfFiles - 1){
              setTimeout(function() {
                kickOffDecryption();
              }, 1500);
            }else {
              console.log("all the files are successfully decrypted")
              setIsDownloading(false);
              handleNext();
            }
          } else {
            console.log("file successfully decrypted")
            setIsDownloading(false);
            handleNext();
          }
          break;
      }
    });
  }, []);

  return (
    <div className={classes.root} {...getRootProps()}>
      <Backdrop open={isDragActive} style={{ zIndex: 1 }}>
        <Typography
          variant="h2"
          gutterBottom
          style={{ color: "#fff", textAlign: "center" }}
        >
          <img
            src="/assets/images/logo2.png"
            width="100"
            height="100"
            alt="hat.sh logo"
          />
          <br />
          {t('drop_file_dec')}
        </Typography>
      </Backdrop>

      <Collapse in={pkAlert} style={{ marginTop: 5 }}>
        <Alert
          severity="success"
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => {
                setPkAlert(false);
              }}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          {t('sender_key_loaded')}
        </Alert>
      </Collapse>

      <Stepper
        activeStep={activeStep}
        orientation="vertical"
        className={classes.stepper}
      >
        <Step key={1}>
          <StepLabel
            StepIconProps={{
              classes: {
                root: classes.stepIcon,
                active: classes.activeStepIcon,
                completed: classes.completedStepIcon,
              },
            }}
          >
            {t('choose_file_dec')}
          </StepLabel>
          <StepContent>
            <div className="wrapper p-3" id="decFileWrapper">
              <div className={classes.fileArea} id="decFileArea">
                
              <Paper elevation={0} style={{overflow:"auto", maxHeight:"280px", backgroundColor: "transparent"}}>
                  <List dense="true" style={{display: "flex", flex: "1",flexWrap: "wrap", alignContent: "center", justifyContent:"center",}}>
                    
                    {Files.length > 0 ? Files.map((file, index) =>
                        <ListItem key={index} style={{backgroundColor: "#ebebeb", borderRadius: "8px", padding:15}}>
                          <ListItemText
                          style={{ width:"100px", maxWidth:"150px", minHeight: "50px", maxHeight: "50px",}}
                            primary={file.name}
                            secondary={formatBytes(file.size)}
                          />
                          <ListItemSecondaryAction>
                            <IconButton style={{marginTop: 40}} onClick={()=>updateFilesInput(index)} edge="end" aria-label="delete">
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        
                    )
                    : t('drag_drop')}

                    </List>
                </Paper>

                <input
                  {...getInputProps()}
                  className={classes.input}
                  id="dec-file"
                  type="file"
                  onChange={(e) => handleFilesInput(e.target.files)}
                  multiple
                />
                <label htmlFor="dec-file">
                  <br />
                  <Button
                    className={classes.browseButton}
                    component="span"
                    startIcon={<DescriptionIcon />}
                  >
                    {Files.length > 0 ? t('change_file') : t('browse_file')}

                  </Button>
                </label>
              </div>
            </div>

            <div className={classes.actionsContainer}>
              <div>
                <Button
                  disabled={isCheckingFile || Files.length === 0}
                  variant="contained"
                  onClick={checkFiles}
                  className={`${classes.nextButton} submitFileDec`}
                  startIcon={
                    isCheckingFile && (
                      <CircularProgress
                        size={24}
                        className={classes.buttonProgress}
                      />
                    )
                  }
                  fullWidth
                >
                  {isCheckingFile ? t('checking_file') : t('next')}
                </Button>
              </div>

              {badFile && (
                <Alert severity="error" style={{ marginTop: 15 }}>
                  {t('file_not_encrypted_corrupted')}
                  <br />
                  {Files.length>1 ? badFile : ""}
                </Alert>
              )}

              {oldVersion && (
                <Alert severity="error" style={{ marginTop: 15 }}>
                  {t('old_version')} {" "} <a href="https://v1.hat.sh/" target="_blank" rel="noreferrer">
                    {"https://v1.hat.sh"}
                  </a>
                  <br />
                  {Files.length>1 ? oldVersion : ""}
                </Alert>
              )}

              {fileMixUp && (
                <Alert severity="error" style={{ marginTop: 15 }}>
                  There is a file mix up ...
                </Alert>
              )}

            </div>
          </StepContent>
        </Step>

        <Step key={2}>
          <StepLabel
            StepIconProps={{
              classes: {
                root: classes.stepIcon,
                active: classes.activeStepIcon,
                completed: classes.completedStepIcon,
              },
            }}
          >
            {decryptionMethod === "secretKey"
              ? t('enter_password_dec')
              : t('enter_keys_dec')}
          </StepLabel>
          <StepContent>
            {decryptionMethod === "secretKey" && (
              <TextField
                required
                type={showPassword ? "text" : "password"}
                error={wrongPassword ? true : false}
                id={
                  wrongPassword
                    ? "outlined-error-helper-text"
                    : "outlined-required"
                }
                className="decPasswordInput"
                label={wrongPassword ? t('error') : t('required')}
                helperText={wrongPassword ? t('wrong_password') : ""}
                placeholder={t('password')}
                variant="outlined"
                value={Password ? Password : ""}
                onChange={(e) => handlePasswordInput(e.target.value)}
                fullWidth
                InputLabelProps={{
                  classes: {
                    root: classes.textFieldLabel,
                    focused: classes.textFieldLabelFocused,
                  },
                }}
                InputProps={{
                  classes: {
                    root: classes.textFieldRoot,
                    focused: classes.textFieldFocused,
                    notchedOutline: classes.textFieldNotchedOutline,
                  },
                  endAdornment: (
                    <Tooltip title={t('show_password')} placement="left">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </Tooltip>
                  ),
                }}
              />
            )}

            {decryptionMethod === "publicKey" && (
              <>
                <TextField
                  id="public-key-input-dec"
                  required
                  error={(wrongPublicKey || keysError) ? true : false}
                  helperText={wrongPublicKey ? t('wrong_public_key') : ""}
                  label={t('sender_public_key')}
                  placeholder={t('enter_sender_public_key')}
                  variant="outlined"
                  value={PublicKey ? PublicKey : ""}
                  onChange={(e) => handlePublicKeyInput(e.target.value)}
                  fullWidth
                  style={{ marginBottom: "15px" }}
                  InputLabelProps={{
                    classes: {
                      root: classes.textFieldLabel,
                      focused: classes.textFieldLabelFocused,
                    },
                  }}
                  InputProps={{
                    classes: {
                      root: classes.textFieldRoot,
                      focused: classes.textFieldFocused,
                      notchedOutline: classes.textFieldNotchedOutline,
                    },

                    endAdornment: (
                      <>
                        <input
                          accept=".public"
                          className={classes.input}
                          id="dec-public-key-file"
                          type="file"
                          onChange={(e) => loadPublicKey(e.target.files[0])}
                        />
                        <label htmlFor="dec-public-key-file">
                          <Tooltip title={t('load_public_key')} placement="left">
                            <IconButton
                              aria-label={t('load_public_key')}
                              component="span"
                            >
                              <AttachFileIcon />
                            </IconButton>
                          </Tooltip>
                        </label>
                      </>
                    ),
                  }}
                />

                <TextField
                  id="private-key-input-dec"
                  type={showPrivateKey ? "text" : "password"}
                  required
                  error={(wrongPrivateKey || keysError) ? true : false}
                  helperText={wrongPrivateKey ? t('wrong_private_key') : ""}
                  label={t('your_private_key_dec')}
                  placeholder={t('enter_private_key_dec')}
                  variant="outlined"
                  value={PrivateKey ? PrivateKey : ""}
                  onChange={(e) => handlePrivateKeyInput(e.target.value)}
                  fullWidth
                  style={{ marginBottom: "15px" }}
                  InputLabelProps={{
                    classes: {
                      root: classes.textFieldLabel,
                      focused: classes.textFieldLabelFocused,
                    },
                  }}
                  InputProps={{
                    classes: {
                      root: classes.textFieldRoot,
                      focused: classes.textFieldFocused,
                      notchedOutline: classes.textFieldNotchedOutline,
                    },

                    endAdornment: (
                      <>
                        {PrivateKey && (
                          <Tooltip title={t('show_private_key')} placement="left">
                            <IconButton
                              onClick={() => setShowPrivateKey(!showPrivateKey)}
                            >
                              {showPrivateKey ? (
                                <Visibility />
                              ) : (
                                <VisibilityOff />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}

                        <input
                          accept=".private"
                          className={classes.input}
                          id="dec-private-key-file"
                          type="file"
                          onChange={(e) => loadPrivateKey(e.target.files[0])}
                        />
                        <label htmlFor="dec-private-key-file">
                          <Tooltip title={t('load_private_key')} placement="left">
                            <IconButton
                              aria-label={t('load_private_key')}
                              component="span"
                            >
                              <AttachFileIcon />
                            </IconButton>
                          </Tooltip>
                        </label>
                      </>
                    ),
                  }}
                />
              </>
            )}

            <div className={classes.actionsContainer}>
              <div>
                <Grid container spacing={1}>
                  <Grid item>
                    <Button
                      disabled={activeStep === 0}
                      onClick={handleBack}
                      className={classes.backButton}
                      fullWidth
                    >
                      {t('back')}
                    </Button>
                  </Grid>
                  <Grid item xs>
                    <Button
                      disabled={
                        (decryptionMethod === "secretKey" && !Password) ||
                        (decryptionMethod === "publicKey" &&
                          (!PublicKey || !PrivateKey)) ||
                        isTestingPassword ||
                        isTestingKeys
                      }
                      variant="contained"
                      onClick={testFilesDecryption}
                      className={`${classes.nextButton} submitKeysDec`}
                      startIcon={
                        (isTestingPassword || isTestingKeys) && (
                          <CircularProgress
                            size={24}
                            className={classes.buttonProgress}
                          />
                        )
                      }
                      fullWidth
                    >
                      {isTestingPassword
                        ? `${currFileState}/${numberOfFiles} ${t('testing_password')}`
                        : isTestingKeys
                        ? `${currFileState}/${numberOfFiles} ${t('testing_keys')}`
                        : t('next')}
                    </Button>
                  </Grid>
                </Grid>
                <br />

                {decryptionMethod === "secretKey" && Files.length > 1 && wrongPassword && !isTestingPassword && (
                  <Alert severity="error">
                    <strong>{Files[currFile].name}</strong> {" "}
                    has a wrong password, password testing stopped, make sure all files have the same correct decryption password
                  </Alert>
                )}

                {decryptionMethod === "publicKey" && keysError && (
                  <Alert severity="error">
                    {keysErrorMessage}
                  </Alert>
                )}

                {decryptionMethod === "publicKey" && (wrongPrivateKey || wrongPublicKey) && !isTestingKeys && !keysError && (
                  <>
                    {Files.length > 1 && (
                      <Alert severity="error">
                        <strong>{Files[currFile].name}</strong> {" "}
                        has wrong keys, keys testing stopped, make sure all files have the same correct decryption keys
                      </Alert>
                    )}
                  </>
                )}

                

              </div>
            </div>
          </StepContent>
        </Step>

        <Step key={3}>
          <StepLabel
            StepIconProps={{
              classes: {
                root: classes.stepIcon,
                active: classes.activeStepIcon,
                completed: classes.completedStepIcon,
              },
            }}
          >
            {t('download_decrypted_file')}
          </StepLabel>

          <StepContent>
            
            {Files.length > 0 && (
              <Alert severity="success" icon={<LockOpenIcon />}>
              <strong>{Files.length>1 ? Files.length : Files[0].name}</strong> {t('ready_to_download')}
              </Alert>
            )}

            <div className={classes.actionsContainer}>
              <Grid container spacing={1}>
                <Grid item>
                  <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                    className={classes.backButton}
                  >
                    {t('back')}
                  </Button>
                </Grid>
                <Grid item xs>
                  <Button
                    disabled={
                      isDownloading ||
                      (!Password && !PublicKey && !PrivateKey) ||
                      Files.length === 0
                    }
                    variant="contained"
                    color="primary"
                    className={classes.nextButton}
                    startIcon={
                      isDownloading ? (
                        <CircularProgress
                          size={24}
                          className={classes.buttonProgress}
                        />
                      ) : (
                        <GetAppIcon />
                      )
                    }
                    fullWidth
                  >
                    <a
                      onClick={(e) => handleEncryptedFilesDownload(e)}
                      className="downloadFileDec"
                      style={{
                        color: "#ffffff",
                        textDecoration: "none",
                      }}
                    >
                      {isDownloading ? t('downloading_file') : t('decrypted_file')}
                    </a>
                  </Button>
                </Grid>
              </Grid>
              <br />

              {isDownloading && (
                <Alert variant="outlined" severity="info">
                  {t('page_close_alert')}
                </Alert>
              )}
            </div>
          </StepContent>
        </Step>
      </Stepper>
      {activeStep === 3 && (
        <Paper elevation={1} className={classes.resetContainer}>
          <Alert
            variant="outlined"
            severity="success"
            style={{ border: "none" }}
          >
            <AlertTitle>{t('success')}</AlertTitle>
            {t('success_downloaded_file_dec')}
          </Alert>

          <Button
            onClick={handleReset}
            className={classes.button}
            variant="outlined"
            startIcon={<RefreshIcon />}
            fullWidth
          >
            {t('decrypt_another_file')}
          </Button>
        </Paper>
      )}
    </div>
  );
}
