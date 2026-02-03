export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_at: string;
};

export type RegisterResponse = {
  id: number;
  email: string;
  token: {
    access_token: string;
    token_type: string;
    expires_at: string;
  };
};
