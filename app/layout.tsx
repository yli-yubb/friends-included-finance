import './style.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}<footer>Built by Yitong Li · <a href="https://t.me/friendsincludedfinance2026_bot" target="_blank">Telegram bot</a> · <a href="https://docs.google.com/spreadsheets/d/1SP9SuJVWp1ERw0dwDAS8lOrn98_mFuqNHmAPr2UiK8w/edit" target="_blank">Google Sheets</a> · <a href="https://github.com/yli-yubb/friends-included-finance" target="_blank">GitHub repository</a></footer></body></html>;
}
