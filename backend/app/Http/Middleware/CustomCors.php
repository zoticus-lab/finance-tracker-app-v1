<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CustomCors
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $origin = $request->header('Origin');
        
        // Always allow requests - for development/testing
        // In production, validate against whitelist
        $allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5175',
            'http://localhost:5001',
            'http://100.64.168.127:5175',
            'http://100.64.168.127:5001',
            'http://100.64.168.127:3000',
        ];

        // For development, allow all origins
        $corsOrigin = in_array($origin, $allowedOrigins) ? $origin : '*';

        // Handle preflight requests
        if ($request->getMethod() === 'OPTIONS') {
            return response('')
                ->header('Access-Control-Allow-Origin', $corsOrigin)
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')
                ->header('Access-Control-Max-Age', '3600')
                ->header('Access-Control-Allow-Credentials', 'true');
        }

        // Process the request
        $response = $next($request);

        // Add CORS headers to response
        $response->header('Access-Control-Allow-Origin', $corsOrigin);
        $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        $response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        $response->header('Access-Control-Allow-Credentials', 'true');
        $response->header('Access-Control-Expose-Headers', 'Authorization');

        return $response;
    }
}
