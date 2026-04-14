import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster, ToastBar, toast } from 'react-hot-toast'
import { FiX } from 'react-icons/fi'
import App from './App'
import GlobalProgressBar from './components/ui/GlobalProgressBar'
import './index.css'

import { keepPreviousData } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 0,             // always re-fetch when invalidated
      refetchOnWindowFocus: false,
      placeholderData: keepPreviousData, // keep old data visible while re-fetching
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <GlobalProgressBar />
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '10px', fontFamily: 'Inter, sans-serif', fontSize: '14px' },
            success: { iconTheme: { primary: '#2E6DA4', secondary: '#fff' } },
          }}
        >
          {(t) => (
            <ToastBar toast={t}>
              {({ icon, message }) => (
                <>
                  {icon}
                  {message}
                  {t.type !== 'loading' && (
                    <button 
                      onClick={() => toast.dismiss(t.id)} 
                      className="p-1 rounded-md hover:bg-gray-100 transition-colors ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600"
                    >
                      <FiX size={14} />
                    </button>
                  )}
                </>
              )}
            </ToastBar>
          )}
        </Toaster>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)
