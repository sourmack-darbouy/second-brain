import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get credentials from environment
  const validUser = process.env.SECOND_BRAIN_USER
  const validPass = process.env.SECOND_BRAIN_PASSWORD
  
  // If no credentials configured, allow access (for initial setup)
  if (!validUser || !validPass) {
    console.log('No auth credentials configured')
    return NextResponse.next()
  }
  
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Second Brain"',
      },
    })
  }
  
  try {
    const authValue = authHeader.split(' ')[1]
    const decoded = Buffer.from(authValue, 'base64').toString('utf-8')
    const [user, pass] = decoded.split(':')
    
    if (user === validUser && pass === validPass) {
      return NextResponse.next()
    }
  } catch (e) {
    // Invalid auth header format
  }
  
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Second Brain"',
    },
  })
}

export const config = {
  matcher: [
    '/',
    '/memories',
    '/memories/:path*',
    '/documents',
    '/documents/:path*',
    '/tasks',
    '/tasks/:path*',
  ],
}
