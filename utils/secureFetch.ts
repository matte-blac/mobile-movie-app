

interface SecureFechOptions extends RequestInit {
    timeout?: number
    retries?: number
    retryDelay?: number
}

const DEFAULT_TIMEOUT = 5000
const DEFAULT_RETRIES = 3
const DEFAULT_RETRY_DELAY = 1000

async function fetchWithTimeout(
    url: string, 
    options: SecureFechOptions = {}
): Promise<Response> {
    const {
        timeout = DEFAULT_TIMEOUT,
        // retries = DEFAULT_RETRIES,
        // retryDelay = DEFAULT_RETRY_DELAY,
        ...fetchOptions
    } = options

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        })

        clearTimeout(timeoutId)
        return response
    } catch (error: any) {
        clearTimeout(timeoutId)

        if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeout}ms`)
        }

        throw error
    }
}

// fetch retry logic and timeout
export async function secureFetch(
    url: string,
    options: SecureFechOptions = {}
): Promise<Response> {
    const {
        retries = DEFAULT_RETRIES,
        retryDelay = DEFAULT_RETRY_DELAY,
        ...fetchOptions
    } = options

    let lastError: Error

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fetchWithTimeout(url, fetchOptions)
        } catch (error: any) {
            lastError = error

            // dont retry certain errors
            if (
                error.message?.includes('timeout') ||
                error.name === 'TypeError' ||
                attempt === retries
            ) {
                throw error
            }

            // wait before retrying
            const delay = retryDelay * Math.pow(2, attempt)
            await new Promise(res => setTimeout(res, delay))
        }
    }

    throw lastError!
}

export async function securePost<T = any>(
    url: string,
    data: any,
    options: SecureFechOptions = {}
): Promise<T> {
    const response = await secureFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        body: JSON.stringify(data),
        ...options,
    })

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
}

export async function secureGet<T = any>(
    url: string,
    options: SecureFechOptions = {}
): Promise<T> {
    const response = await secureFetch(url, {
        method: 'GET',
        ...options,
    })

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
}