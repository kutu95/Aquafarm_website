import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from './_app';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function Greenhouse() {
  const { user, role, loading } = useContext(AuthContext);
  const router = useRouter();
  const [stats, setStats] = useState({
    activeGrowbeds: 0,
    fishtanks: 0,
    totalHoles: 0,
    totalGrowbedArea: 0,
    totalFlowrate: 0,
    totalActiveVolume: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      
      // Fetch active growbeds with flowrate, holes, area, and volume
      const { data: growbeds, error: growbedsError } = await supabase
        .from('growbeds')
        .select('flowrate, holes, area, volume')
        .eq('status', 'active');

      if (growbedsError) throw growbedsError;

      // Fetch fishtanks with flowrate and volume
      const { data: fishtanks, error: fishtanksError } = await supabase
        .from('fishtanks')
        .select('flowrate, volume, status');

      if (fishtanksError) throw fishtanksError;

      // Calculate totals from active growbeds and fishtanks
      const growbedsFlowrate = growbeds?.reduce((total, gb) => total + (gb.flowrate || 0), 0) || 0;
      const fishtanksFlowrate = fishtanks?.reduce((total, ft) => total + (ft.flowrate || 0), 0) || 0;
      const totalFlowrate = growbedsFlowrate + fishtanksFlowrate;

      const totalHoles = growbeds?.reduce((total, gb) => total + (gb.holes || 0), 0) || 0;
      const totalGrowbedArea = growbeds?.reduce((total, gb) => total + (gb.area || 0), 0) || 0;
      
      // Calculate total active system volume (active growbeds + active fishtanks)
      const growbedsVolume = growbeds?.reduce((total, gb) => total + (gb.volume || 0), 0) || 0;
      const activeFishtanksVolume = fishtanks?.reduce((total, ft) => total + (ft.volume || 0), 0) || 0;
      const totalActiveVolume = growbedsVolume + activeFishtanksVolume;

      setStats({
        activeGrowbeds: growbeds?.length || 0,
        fishtanks: fishtanks?.length || 0,
        totalHoles: totalHoles,
        totalGrowbedArea: totalGrowbedArea,
        totalFlowrate: totalFlowrate,
        totalActiveVolume: totalActiveVolume
      });

    } catch (error) {
      console.error('Error fetching greenhouse stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }



  const managementSections = [
    {
      title: 'Growbeds',
      description: 'Manage growbed configurations, holes, flow rates, and types',
      href: '/greenhouse/growbeds',
      icon: '🌱',
      color: 'bg-green-500'
    },
    {
      title: 'Fish Tanks',
      description: 'Manage fishtank volumes, flow rates, and status',
      href: '/greenhouse/fishtanks',
      icon: '🐟',
      color: 'bg-blue-500'
    },
    {
      title: 'Crops',
      description: 'Manage crop types, seeds per pot, and harvest times',
      href: '/greenhouse/crops',
      icon: '🥬',
      color: 'bg-emerald-500'
    },
    {
      title: 'Fish',
      description: 'Manage fish populations, types, and tank assignments',
      href: '/greenhouse/fish',
      icon: '🐠',
      color: 'bg-cyan-500'
    },
    {
      title: 'Seeding',
      description: 'Track planting dates and crop seeding activities',
      href: '/greenhouse/seeding',
      icon: '🌿',
      color: 'bg-lime-500'
    },
    {
      title: 'Crop Types',
      description: 'Manage vegetable categories and descriptions',
      href: '/greenhouse/crop-types',
      icon: '🥕',
      color: 'bg-orange-500'
    },
    {
      title: 'Fish Types',
      description: 'Manage fish species and descriptions',
      href: '/greenhouse/fish-types',
      icon: '🦈',
      color: 'bg-indigo-500'
    }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Greenhouse Management
              {role !== 'admin' && <span className="text-sm text-gray-500 ml-2">(Read Only)</span>}
            </h1>
            <p className="text-gray-600">
              {role === 'admin' 
                ? 'Manage your aquaponics system, crops, fish, and growing operations'
                : 'View your aquaponics system, crops, fish, and growing operations'
              }
            </p>
          </div>

          {/* Management Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {managementSections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 hover:border-gray-300"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className={`${section.color} text-white rounded-lg p-3 text-2xl mr-4`}>
                      {section.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                      {section.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {section.description}
                  </p>
                  <div className="mt-4 flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700 transition-colors duration-200">
                    Manage
                    <svg className="ml-1 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Overview</h2>
            {statsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading statistics...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.activeGrowbeds}</div>
                  <div className="text-sm text-gray-600">Active Growbeds</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.fishtanks}</div>
                  <div className="text-sm text-gray-600">Fish Tanks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{stats.totalHoles}</div>
                  <div className="text-sm text-gray-600">Total Holes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-600">{stats.totalGrowbedArea.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">Total Area (m²)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.totalActiveVolume.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">Total Volume (L)</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
