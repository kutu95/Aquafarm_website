-- Create page_templates table
CREATE TABLE IF NOT EXISTS page_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  meta_description TEXT,
  meta_title VARCHAR(255),
  og_title VARCHAR(255),
  og_description TEXT,
  og_image VARCHAR(500),
  canonical_url VARCHAR(500),
  robots_meta VARCHAR(100) DEFAULT 'index, follow',
  priority INTEGER DEFAULT 1,
  security VARCHAR(50) DEFAULT 'open',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_page_templates_active ON page_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_page_templates_priority ON page_templates(priority);

-- Insert default templates
INSERT INTO page_templates (name, title, slug, content, meta_description, priority) VALUES
(
  'about',
  'About Us',
  'about',
  '<h2>About Margaret River Aquafarm</h2><p>Welcome to Margaret River Aquafarm, where we combine sustainable aquaculture practices with environmental stewardship...</p><h3>Our Mission</h3><p>We are committed to...</p><h3>Our Values</h3><ul><li>Sustainability</li><li>Environmental Protection</li><li>Community Engagement</li><li>Innovation</li></ul>',
  'Learn about Margaret River Aquafarm, our mission, values, and commitment to sustainable aquaculture and environmental protection.',
  5
),
(
  'services',
  'Our Services',
  'services',
  '<h2>Our Services</h2><p>At Margaret River Aquafarm, we offer a range of sustainable aquaculture services...</p><h3>Aquaculture Solutions</h3><p>We provide...</p><h3>Environmental Consulting</h3><p>Our team offers...</p><h3>Educational Programs</h3><p>We conduct...</p>',
  'Discover our comprehensive aquaculture services, environmental consulting, and educational programs at Margaret River Aquafarm.',
  4
),
(
  'contact',
  'Contact Us',
  'contact',
  '<h2>Contact Margaret River Aquafarm</h2><p>Get in touch with us to learn more about our services or to discuss your aquaculture needs.</p><h3>Get In Touch</h3><p><strong>Email:</strong> info@margaretriveraquafarm.com</p><p><strong>Phone:</strong> +61 (0)8 9757 XXXX</p><p><strong>Address:</strong> Margaret River, Western Australia</p><h3>Business Hours</h3><p>Monday - Friday: 9:00 AM - 5:00 PM</p><p>Saturday: 9:00 AM - 1:00 PM</p><p>Sunday: Closed</p>',
  'Contact Margaret River Aquafarm for aquaculture services, environmental consulting, and educational programs. Get in touch today.',
  3
),
(
  'volunteer',
  'Volunteer Opportunities',
  'volunteer',
  '<h2>Volunteer with Us</h2><p>Join our team of dedicated volunteers and contribute to sustainable aquaculture and marine conservation.</p><h3>Why Volunteer?</h3><ul><li>Gain hands-on experience in aquaculture</li><li>Contribute to environmental conservation</li><li>Learn from industry experts</li><li>Make a positive impact</li></ul><h3>Available Positions</h3><p>We offer various volunteer opportunities including...</p><p><a href="/volunteer-application" class="btn btn-primary">Apply Now</a></p>',
  'Join Margaret River Aquafarm as a volunteer. Gain experience in sustainable aquaculture and contribute to marine conservation efforts.',
  2
),
(
  'custom',
  'Custom Page',
  'custom-page',
  '<h2>Page Title</h2><p>Start writing your content here...</p>',
  'Page description for SEO',
  1
);

-- Add RLS policies
ALTER TABLE page_templates ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage templates
CREATE POLICY "Admins can manage templates" ON page_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow all authenticated users to view active templates
CREATE POLICY "Users can view active templates" ON page_templates
  FOR SELECT USING (
    is_active = true AND
    auth.role() = 'authenticated'
  ); 