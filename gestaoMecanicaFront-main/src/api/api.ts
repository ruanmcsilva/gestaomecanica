import axios from 'axios';


//Criar uma estancia do axios

const api = axios.create({
    baseURL: 'http://localhost:8000/api/v1/',
    headers: {
        'Content-Type': 'application/json',
    },
});


// Interceptor para adicionar o token de autenticação a todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


//Funcao para fazer login
export const login = async (username, password) => {
  const response = await api.post('token/', {
    username,
    password,
  });
  localStorage.setItem('access_token', response.data.access);
  localStorage.setItem('refresh_token', response.data.refresh);
  return response.data;
};

//Funcao para fazer logout
export const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
}

//Funcao para buscar os dados do usuario logado
export const getUserData = async () => {
  const response = await api.get('sessao/');
  return response.data
};

export default api;