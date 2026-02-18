import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (authHeader) {
    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':')
    const user = auth[0]
    const pass = auth[1]
    
    const validUser = process.env.SECOND_BRAIN_USER || 'admin'
    const validPass = process.env.SECOND_BRAIN_PASSWORD
    
    if (user === validUser && pass === validPass) {
      return NextResponse.next()
    }
  }
  
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Second Brain - Enter credentials"'
    }
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately if needed)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
