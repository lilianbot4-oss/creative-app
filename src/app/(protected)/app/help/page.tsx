import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Help & Workflow</h1>
        <p className="text-muted-foreground">
          Quick guidance for turning a brief into a client-ready pitch pack.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Recommended workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ol className="list-decimal space-y-2 pl-4">
            <li>Upload a brief (PDF/PPTX) or paste a raw brief.</li>
            <li>Parse the Creative Map to extract objective, constraints, and tone.</li>
            <li>Create Human concepts or generate AI concepts.</li>
            <li>Select a concept and generate variants if needed.</li>
            <li>Generate scripts and refine with feedback.</li>
            <li>Generate a storyboard and shotlist.</li>
            <li>Export the client-ready pitch pack.</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Glossary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Creative Map</p>
            <p>Structured brief summary with constraints, tone tags, and deliverables.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Concept vs Variant vs Script</p>
            <p>Concepts are big ideas, variants are angles, scripts are executable formats.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Primary output/script</p>
            <p>Used by default in exports and pitch packs.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Provenance labels</p>
            <p>Human, AI Assisted, and AI Generated show how the idea was created.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>FAQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Are my files stored?</p>
            <p>No. Files are parsed in your browser and only extracted text is saved.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Why is AI disabled?</p>
            <p>Add OPENAI_API_KEY to .env.local and restart the dev server.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">How do I control AI costs?</p>
            <p>Usage limits apply per user per day. You can also pick lighter models.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
