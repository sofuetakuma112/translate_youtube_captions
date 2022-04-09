# このリポジトリについて
Youtubeで自動生成された英語字幕データを取得して、BERTベースの句読点復元モデルとDeepLを用いてより高精度な日本語字幕を生成します

# 注意
Pythonライブラリであるrpunctの使用にNvidia製のグラフィックカードが必要となります。

# Install 
1. PythonとJavaScriptの実行環境を用意する
https://www.python.org/
https://nodejs.org/ja/

2. `pip install rpunct`で句読点復元モデルをインストール

3. クローンしたリポジトリのルートディレクトリで
`npm install`
を実行する

4. GCPでプロジェクトを作成してYouTube Data APIを登録する

5. 作成したGCPプロジェクト内でAPIキーを生成する

6. ルートディレクトリに`.env`ファイルを生成して、生成したAPIキーを貼り付ける
`YOUTUBE_DATA_API_KEY="XXXXXXXXXXXXXXXXXXXXXXXXXXXXX"`

# 使用方法
和訳したいYoutube動画のIDを取得します

IDは例えばhttps://www.youtube.com/watch?v=446E-r0rXHI の場合、クエリパラメータのvがIDに相当します

取得したIDを引数にtranslate.shを以下のように実行します

`./translate.sh 446E-r0rXHI`

すると、`./captions/446E-r0rXHI`ディレクトリ内に翻訳後の字幕データである`captions_ja.srt`ファイルが生成されます。

生成した字幕ファイルを[ブラウザ拡張機能](https://chrome.google.com/webstore/detail/substital-add-subtitles-t/kkkbiiikppgjdiebcabomlbidfodipjg)等で読み込むことでYoutube上で表示できます