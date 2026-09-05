from fastapi import FastAPI,Request


app = FastAPI()

@app.get("/", include_in_schema=False)
def home():
    return {"message": "Hello, World!"}

@app.get("/login")
def get_login_info():
    return {"message": "Login successful!"}
