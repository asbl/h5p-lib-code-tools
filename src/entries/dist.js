import Markdown from '../scripts/markdown';
import '../styles/markdown.css';
import '../styles/h5p-codetools.css';
import CodeContainer from '../scripts/code-container';
import Util from '../scripts/services/util';
import { initializeFontAwesome } from '../scripts/services/fontawesome';
import ButtonClickedObserver from '../scripts/manager/observer/buttonclickedobserver';
import StateRunObserver from '../scripts/manager/observer/staterunobserver';
import StateStopObserver from '../scripts/manager/observer/statestopobserver';
import PageIsVisibleObserver from '../scripts/manager/observer/pageisvisibleobserver';
import PageShowObserver from '../scripts/manager/observer/pageshowobserver';
import PageHideObserver from '../scripts/manager/observer/pagehideobserver';
import PageIsEmptyObserver from '@scripts/manager/observer/pageisemptyobserver';
import DialogQueue from '@scripts/dialog-queue';

initializeFontAwesome();

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