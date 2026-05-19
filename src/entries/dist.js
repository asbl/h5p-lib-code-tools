import Markdown from '../scripts/markdown';
import '../styles/markdown.css';
import '../styles/h5p-codetools.css';
import CodeContainer from '../scripts/code-container';
import Util from '../scripts/services/util';
import ButtonClickedObserver from '../scripts/manager/observer/buttonclickedobserver';
import StateRunObserver from '../scripts/manager/observer/staterunobserver';
import StateStopObserver from '../scripts/manager/observer/statestopobserver';
import PageIsVisibleObserver from '../scripts/manager/observer/pageisvisibleobserver';
import PageShowObserver from '../scripts/manager/observer/pageshowobserver';
import PageHideObserver from '../scripts/manager/observer/pagehideobserver';
import PageIsEmptyObserver from '@scripts/manager/observer/pageisemptyobserver';
import DialogQueue from '@scripts/dialog-queue';
import {
  getBlocklyPythonGenerator,
} from '../scripts/editor/blockly/blockly-runtime';
import {
  getLanguagePack,
  getRegisteredBlocklyLanguageKeys,
  registerBlocklyLanguagePack,
  resetBlocklyLanguagePacks,
} from '../scripts/editor/blockly/blockly-language-packs';
import {
  getRegisteredBlocklyPackageManagers,
  registerBlocklyPackageManagers,
  resetBlocklyPackageManagers,
} from '../scripts/editor/blockly/blockly-package-managers';

// Load library
H5P.Markdown = Markdown;
H5P.CodeContainer = CodeContainer;
H5P.Util = Util;

//Observer
H5P.ButtonClickedObserver = ButtonClickedObserver;
H5P.StateRunObserver = StateRunObserver;
H5P.StateStopObserver = StateStopObserver;
H5P.PageIsVisibleObserver = PageIsVisibleObserver;
H5P.PageShowObserver = PageShowObserver;
H5P.PageHideObserver = PageHideObserver;
H5P.PageIsEmptyObserver = PageIsEmptyObserver;
H5P.DialogQueue = DialogQueue;
H5P.getBlocklyPythonGenerator = getBlocklyPythonGenerator;
H5P.registerBlocklyLanguagePack = registerBlocklyLanguagePack;
H5P.getBlocklyLanguagePack = getLanguagePack;
H5P.getRegisteredBlocklyLanguageKeys = getRegisteredBlocklyLanguageKeys;
H5P.resetBlocklyLanguagePacks = resetBlocklyLanguagePacks;
H5P.registerBlocklyPackageManagers = registerBlocklyPackageManagers;
H5P.getRegisteredBlocklyPackageManagers = getRegisteredBlocklyPackageManagers;
H5P.resetBlocklyPackageManagers = resetBlocklyPackageManagers;
