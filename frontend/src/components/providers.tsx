'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { StellarProvider } from '@/contexts/StellarContext'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => 
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          refetchOnWindowFocus: false,
          retry: (failureCount, error) => {
            // Don't retry for certain error types
            if (error instanceof Error && error.message.includes('User rejected')) {
              return false
            }
            return failureCount < 3
          },
        },
        mutations: {
          retry: false,
        },
      },
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <StellarProvider>
        {children}
      </StellarProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}