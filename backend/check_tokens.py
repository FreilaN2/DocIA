import os
import requests
from dotenv import load_dotenv

_ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=_ENV_PATH, override=True, encoding="utf-8-sig")

KEYS = [os.getenv("DEEPSEEK_API_KEY")] + [os.getenv(f"DEEPSEEK_API_KEY_{i}") for i in range(1, 9)]
MODELS = ["deepseek-chat"]


def check_key(key, index):
    if not key:
        return

    print(f"\n--- Checking DeepSeek Key #{index} ---")
    safe_key = f"{key[:6]}...{key[-4:]}" if len(key) > 10 else "***"
    print(f"Key preview: {safe_key}")

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    # Consultar saldo en DeepSeek
    try:
        bal_res = requests.get(
            "https://api.deepseek.com/user/balance",
            headers=headers,
            timeout=15,
        )
        if bal_res.status_code == 200:
            data = bal_res.json()
            is_available = data.get("is_available", False)
            balance_infos = data.get("balance_infos", [])
            print(f"  Disponible: {is_available}")
            for b in balance_infos:
                print(f"  Saldo ({b.get('currency')}): {b.get('total_balance')}")
    except Exception as e:
        print(f"  No se pudo consultar el saldo: {e}")

    for model in MODELS:
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "hi"}],
            "max_tokens": 1,
        }

        try:
            res = requests.post(
                "https://api.deepseek.com/chat/completions",
                headers=headers,
                json=payload,
                timeout=15,
            )

            if res.status_code == 200:
                print(f"  [{model}] -> OK (200)")
            elif res.status_code == 429:
                print(f"  [{model}] -> ¡LÍMITE ALCANZADO (429)!")
            else:
                print(f"  [{model}] -> Error {res.status_code}: {res.text}")
        except Exception as e:
            print(f"  [{model}] -> Error de conexión: {e}")


if __name__ == "__main__":
    print("==============================================")
    print(" Verificando API Key de DeepSeek")
    print("==============================================")
    valid_keys = [k.strip() for k in KEYS if k and k.strip()]
    if not valid_keys:
        print("No se encontró DEEPSEEK_API_KEY en .env")
    else:
        for i, key in enumerate(dict.fromkeys(valid_keys), start=1):
            check_key(key, i)
    print("\nProceso finalizado.")
