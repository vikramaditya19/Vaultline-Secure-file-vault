from pydantic import BaseModel, Field

class UserPublic(BaseModel):
    id: str
    email: str


# ---- register request ------

class RegisterRequest(BaseModel):
    email:str
    authproof : str
    publicKeyB64 : str
    wrappedPrivateKeyB64 : str


class fetchsaltRequest(BaseModel):
    email:str

class fetchsaltResponse(BaseModel):
    email:str      

class loginRequest(BaseModel):
    email:str
    authproof:str

# shared response for register and login

class AuthResponse(BaseModel):
    user:UserPublic
    token:str
    wrappedPrivateKeyB64:str       
    salt:str


# look up public key 

class lookupPublicKeyRequest(BaseModel):
    email:str

class lookupPublicKeyResponse(BaseModel):
    email:str
    publicKeyB64:str

class logoutResponse(BaseModel):
    success:bool    