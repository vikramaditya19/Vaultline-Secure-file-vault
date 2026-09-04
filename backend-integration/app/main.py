from fastapi import FastAPI

app = FastAPI()

@app.get("/")

def greet():
    return {"message": "Hello, World!"}

@app.get("/items")
def get_all_items():
    return {"items": ["item1", "item2", "item3"]}