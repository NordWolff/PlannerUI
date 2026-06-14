import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:3000/api' })

function getToken() {
  const m = document.cookie.match(/(?:^|; )planner_token=([^;]*)/)
  return m ? decodeURIComponent(m[1]) : sessionStorage.getItem('planner_token')
}

api.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      document.cookie = 'planner_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'
      sessionStorage.removeItem('planner_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
