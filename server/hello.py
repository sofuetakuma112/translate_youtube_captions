from rpunct import RestorePuncts
from flask import Flask, request, jsonify, make_response

app = Flask(__name__)


@app.route("/hoge", methods=["GET"])
def getHoge():
    # URLパラメータ
    params = request.args
    response = {}
    if "param" in params:
        response.setdefault("res", "param is : " + params.get("param"))
    return make_response(jsonify(response))


@app.route("/api/restorePunc", methods=["POST"])
def postHoge():
    # ボディ(application/json)パラメータ
    params = request.json
    response = {}
    if "text" in params:
        text = params.get("text")
        rpunct = RestorePuncts()
        text_with_punc = rpunct.punctuate(text)
        response.setdefault("res", text_with_punc)
    return make_response(jsonify(response))


app.run(host="127.0.0.1", port=5000)


# f = open("text/restored_punc_escaped_original_period.txt", "w")
# f.write(result)
# f.close()
