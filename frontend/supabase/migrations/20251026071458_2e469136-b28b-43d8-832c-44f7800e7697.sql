-- Create appraisers table
CREATE TABLE public.appraisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  appraiser_name text NOT NULL,
  photo_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create appraisals table
CREATE TABLE public.appraisals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appraiser_id uuid REFERENCES public.appraisers(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  number_of_items integer NOT NULL,
  testing_method text NOT NULL,
  test_results text,
  remarks text,
  compliance_image_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create jewellery_items table
CREATE TABLE public.jewellery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appraisal_id uuid REFERENCES public.appraisals(id) ON DELETE CASCADE NOT NULL,
  item_number integer NOT NULL,
  image_url text,
  purity_result text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.appraisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jewellery_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appraisers
CREATE POLICY "Users can view their own appraisers"
  ON public.appraisers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own appraisers"
  ON public.appraisers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appraisers"
  ON public.appraisers FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for appraisals
CREATE POLICY "Users can view their own appraisals"
  ON public.appraisals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own appraisals"
  ON public.appraisals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appraisals"
  ON public.appraisals FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for jewellery_items
CREATE POLICY "Users can view jewellery items from their appraisals"
  ON public.jewellery_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appraisals
      WHERE appraisals.id = jewellery_items.appraisal_id
      AND appraisals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert jewellery items for their appraisals"
  ON public.jewellery_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appraisals
      WHERE appraisals.id = jewellery_items.appraisal_id
      AND appraisals.user_id = auth.uid()
    )
  );

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('appraisal-images', 'appraisal-images', true);

-- Storage policies
CREATE POLICY "Users can upload their own appraisal images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'appraisal-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view appraisal images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'appraisal-images');

CREATE POLICY "Users can update their own images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'appraisal-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'appraisal-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );