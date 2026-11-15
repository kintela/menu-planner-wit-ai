-- Object replacement is INSERT + RPC association + explicitly authorized DELETE.
DROP POLICY IF EXISTS "recipe images update managed" ON storage.objects;
