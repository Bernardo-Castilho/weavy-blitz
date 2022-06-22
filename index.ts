// Import stylesheets
import 'wijmo/styles/wijmo-core.css';
import './style.css';

// import Wijmo components
import { FlexGrid } from 'wijmo/wijmo.grid';
import { FlexGridFilter, FilterType } from 'wijmo/wijmo.grid.filter';
import { FlexChart } from 'wijmo/wijmo.chart';
import { Popup } from 'wijmo/wijmo.input';
import { Tooltip, PopupPosition } from 'wijmo/wijmo';
import { OAuth2, GoogleSheet } from 'wijmo/wijmo.cloud';


///////////////////////////////////////////////////////
//
// ** OAuth2 object used to log in/out of the app
// app must be authorized in "Authorized JavaScript origins":
// https://console.cloud.google.com/apis/credentials
//
///////////////////////////////////////////////////////
const API_KEY = 'AIzaSyCdupkmi6onZ1f20iYrPY0CJq3fJreGRoU';
const CLIENT_ID = '12671315882-r8otedp4h90bv5osi6vi7obm33tulpj9.apps.googleusercontent.com';
const oAuth = new OAuth2(API_KEY, CLIENT_ID);

// button to log in/out
const oAuthBtn = document.getElementById('auth-btn');
const oAuthTip = new Tooltip({
  cssClass: 'auth-tip',
  position: PopupPosition.BelowRight,
  gap: 20,
});
oAuthBtn.addEventListener('click', () => {
  if (oAuth.user) {
    oAuth.signOut();
  } else {
    //oAuth.signIn();
    oAuth._auth().signIn({ prompt: 'select_account' });
  }
});

// update button caption and Weavy instance when user changes
oAuth.userChanged.addHandler(s => {
  let user = s.user;
  oAuthBtn.textContent = user ? 'Sign Out' : 'Sign In';
  oAuthTip.setTooltip(
    oAuthBtn,
    user
      ? `<b>Signed in as</b><br/>${user.firstName}<br/>
        <img src="${user.imageUrl}"/><br/>
        <span class="e-mail">${user.eMail}</span>`
      : null
  );
  updateWeavy(user);
});
oAuth.error.addHandler((s, e) => console.log('auth error: ', e.error));


///////////////////////////////////////////////////////
//
// ** Load dashboard data from Google Sheets
//
///////////////////////////////////////////////////////
const SHEET_ID = '1wGuU-8gMIcMHjNBsP99XJ1Ziab5SMwdzS9_mcfSUuT0';
const sheets = new GoogleSheet(SHEET_ID, API_KEY, {
  sheets: ['Sales'],
});
const theData = sheets.getSheet('Sales');


///////////////////////////////////////////////////////
//
// ** Dashboard: shows the data in a grid and a chart
//
///////////////////////////////////////////////////////
const theGrid = new FlexGrid('#theGrid', {
  isReadOnly: true,
  selectionMode: 'ListBox', //"MultiRange",
  autoGenerateColumns: false,
  alternatingRowStep: 0,
  columns: [
    { binding: 'Product', width: '*' },
    { binding: 'Sales', format: 'n0', width: '*' },
  ],
  headersVisibility: 'Column',
  itemsSource: theData,
});

// add a filter to the grid
const theFilter = new FlexGridFilter(theGrid);
const col = theGrid.getColumn('Sales');
const cf = theFilter.getColumnFilter(col);
cf.filterType = FilterType.Condition;

// show the data in a chart
const theChart = new FlexChart('#theChart', {
  //bindingX: "Product",
  series: [{ name: 'Sales', binding: 'Sales' }],
  tooltip: { content: '<b>{Product}</b><br/>{Sales:c2}' },
  header: 'Sales',
  axisX: { position: 'None' },
  axisY: { position: 'None' },
  legend: { position: 'None' },
  selectionMode: 'Point',
  itemsSource: theData,
});

// make body focusable
document.body.tabIndex = 0;


///////////////////////////////////////////////////////
//
// Weavy: in-app collaboration
//
///////////////////////////////////////////////////////
import Weavy from '@weavy/dropin-js';
import '@weavy/themes/dist/weavy-default.css';

// get weavy token
async function getWeavyToken() {
  return oAuth.idToken;
}

// Weavy instance and apps
// our Weavy instance is a sandbox created at https://get.weavy.io/
const weavy = new Weavy({
  url: 'https://wijmo.weavy.io',
  jwt: getWeavyToken,
});

// Messenger app
const messenger = weavy.app({
  id: 'messenger',
  type: 'messenger',
  container: '#theChat',
  open: false,
});

// create the popups for the apps
const theFeedPopup = new Popup('#theFeed', {
  owner: document.getElementById('btnFeed'),
});
const theDocsPopup = new Popup('#theDocs', {
  owner: document.getElementById('btnDocs'),
});
const theChatPopup = new Popup('#theChat', {
  owner: document.getElementById('btnChat'),
  shown: () => {
    
    // wait for popup to finish DOM modifications
    requestAnimationFrame(() => {
      messenger.reset(); // reconnect iframe after DOM modifications
      messenger.open();
    });
  },
});

// update Weavy authorization and buttons when a user logs in or out
function updateWeavy(user) {

  // toggle Weavy buttons depending on whether a user is logged in
  document
    .getElementById('weavy-btns')
    .classList.toggle('hidden', user == null);
  document
    .getElementById('no-weavy-btns')
    .classList.toggle('hidden', user != null);

  // make sure all popups are closed
  theFeedPopup.hide();
  theDocsPopup.hide();
  theChatPopup.hide();

  // log in/out depending on whether we have a user
  if (user) {
    weavy.authentication.setJwt(getWeavyToken); // needed to support user switching
    weavy.authentication.signIn();
  } else {
    weavy.authentication.signOut();
  }
}
