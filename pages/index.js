import { useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { AuthContext } from './_app';

export default function Home() {
  const router = useRouter();
  const { user, role } = useContext(AuthContext);
  const isAdmin = role === 'admin';

  return (
    <>
      <NavBar />
      <div className="p-6 max-w-4xl mx-auto">
        <article className="prose max-w-none">
          <h1 className="text-4xl font-bold mb-6">Welcome to Aquafarm</h1>
          
          <div className="mb-8">
            <p className="text-lg text-gray-700 mb-4">
              Welcome to Aquafarm, your gateway to sustainable aquaculture and marine conservation. 
              We are dedicated to promoting responsible aquaculture practices and protecting our marine ecosystems.
            </p>
            
            <p className="text-lg text-gray-700 mb-4">
              Our mission is to advance sustainable aquaculture technologies while preserving the health 
              of our oceans and supporting coastal communities.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4 text-blue-800">Our Mission</h2>
              <p className="text-gray-700">
                To promote sustainable aquaculture practices that protect marine ecosystems 
                while providing food security for future generations.
              </p>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4 text-green-800">Get Involved</h2>
              <p className="text-gray-700">
                Join our volunteer program and help us make a difference in marine conservation 
                and sustainable aquaculture development.
              </p>
              <a 
                href="/volunteer-application" 
                className="inline-block mt-4 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Apply to Volunteer
              </a>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Latest Updates</h2>
            <p className="text-gray-700">
              Stay tuned for the latest news and updates about our projects, research findings, 
              and community initiatives. We're constantly working to improve our practices and 
              share knowledge with the aquaculture community.
            </p>
          </div>
        </article>
        
        {isAdmin && (
          <div className="mt-8 text-center text-gray-500">
            <a 
              href="/dashboard" 
              className="hover:text-gray-700 underline"
            >
              Go to Dashboard
            </a>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}