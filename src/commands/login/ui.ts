import * as vscode from 'vscode';
import { getDistFilePath } from '@/utils/html';
import useWebviewResponseHandle from '@/utils/webviewResponse';
import {
  checkCookie,
  genClientID,
  getCaptcha,
  login,
  searchUser,
  sendMail2fa,
  unlock
} from '@/utils/api';
import { isAxiosError } from 'axios';
import { promisify } from 'util';

export default async function showLoginView() {
  const panel = vscode.window.createWebviewPanel(
    'login',
    `洛谷 - 登录`,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.file(globalThis.resourcesPath),
        vscode.Uri.file(globalThis.distPath)
      ]
    }
  );
  let uid = 0,
    clientID = await genClientID();
  let successful = false;
  useWebviewResponseHandle(panel.webview, {
    NeedCaptcha: async () => ({
      captchaImage: (await getCaptcha({ uid: uid, clientID })).toString(
        'base64'
      )
    }),
    PasswordLogin: data =>
      login(data.username, data.password, data.captcha, {
        uid: (uid = 0),
        clientID
      })
        .then(x => {
          if (x.uid === undefined)
            throw new Error('Cookie not found in header');
          uid = x.uid;
          return { type: x.locked ? ('2fa' as const) : undefined };
        })
        .then(x => {
          if (x.type === undefined) (successful = true), panel.dispose();
          return x;
        })
        .catch(err => {
          if (isAxiosError(err) && err.response)
            vscode.window.showErrorMessage(err.response.data.errorMessage);
          else
            console.error('Login Failed', err),
              vscode.window.showErrorMessage('出现未知错误。');
          return { type: 'error' };
        }),
    CookieLogin: async data => {
      const r = await checkCookie(data);
      if (r) {
        (uid = data.uid), (clientID = data.clientID), (successful = true);
        panel.dispose();
      } else vscode.window.showErrorMessage('验证失败。');
      return { type: r ? undefined : 'error' };
    },
    clearLoginCookie: async () =>
      void ((uid = 0), (clientID = await genClientID())),
    SendMailCode: async ({ captcha }) =>
      sendMail2fa(captcha, { uid, clientID })
        .then(() => ({
          type: undefined
        }))
        .catch(err => {
          if (!isAxiosError(err) || !err.response)
            throw new Error('Unknown Error', { cause: err });
          vscode.window.showErrorMessage(err.response.data.errorMessage);
          return { type: 'error' };
        }),
    '2fa': async ({ code }) =>
      await unlock(code, { uid, clientID })
        .then(() => ((successful = true), panel.dispose(), { type: undefined }))
        .catch(err => {
          if (!isAxiosError(err) || !err.response)
            throw new Error('Unknown Error', { cause: err });
          vscode.window.showErrorMessage(err.response.data.errorMessage);
          return { type: 'error' };
        })
  });
  panel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
        <script defer src=${getDistFilePath(panel.webview, 'login.js')}></script>
        <div id="app"></div>
        </body>
        </html>
    `;
  await promisify(panel.onDidDispose)();
  if (successful)
    return {
      uid,
      clientID,
      name: (await searchUser(uid.toString(), { uid, clientID })).users[0]!.name
    };
  else throw new Error('Canceled');
}
