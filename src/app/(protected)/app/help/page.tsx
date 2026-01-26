import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Help & Workflow</h1>
        <p className="text-muted-foreground">
          Learn how to turn a client brief into a polished, ready-to-present pitch pack.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This app helps creative teams develop advertising campaigns from initial brief to
            client-ready pitch. You can work entirely manually, use AI assistance, or combine both
            approaches.
          </p>
          <ol className="list-decimal space-y-3 pl-4">
            <li>
              <span className="font-medium text-foreground">Create a client and project</span>
              <p>
                Start by adding a client from the Clients page, then create a project under that
                client. Each project represents a single campaign or brief.
              </p>
            </li>
            <li>
              <span className="font-medium text-foreground">Upload or paste your brief</span>
              <p>
                In the project workspace, upload PDF or PPTX files containing your client brief, or
                paste raw brief text directly. Files are parsed in your browser for privacy.
              </p>
            </li>
            <li>
              <span className="font-medium text-foreground">Generate a Creative Map</span>
              <p>
                Parse the brief to extract key information: target audience, key message,
                constraints (must-do and must-avoid), and tone. This structured summary guides all
                creative work.
              </p>
            </li>
            <li>
              <span className="font-medium text-foreground">Develop concepts</span>
              <p>
                Create campaign concepts manually or generate them with AI. Each concept is a big
                creative idea that can be expanded into multiple variants and scripts.
              </p>
            </li>
            <li>
              <span className="font-medium text-foreground">Write and refine scripts</span>
              <p>
                Turn concepts into production-ready scripts. Choose from multiple formats and use AI
                to refine tone, simplify language, or adjust for budget.
              </p>
            </li>
            <li>
              <span className="font-medium text-foreground">Build storyboards</span>
              <p>
                Generate visual storyboards with frame-by-frame breakdowns including shot types,
                settings, and actions. Optionally generate images for each frame.
              </p>
            </li>
            <li>
              <span className="font-medium text-foreground">Export your pitch pack</span>
              <p>
                Use the Pitch view to assemble a client-ready presentation with your creative map,
                top concepts, primary script, storyboard, and supporting materials.
              </p>
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Script formats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Generate scripts in different formats depending on your deliverables:</p>
          <div className="grid gap-2">
            <div>
              <p className="font-medium text-foreground">Launch 30s / Launch 60s</p>
              <p>
                Standard TV or digital video spots. Includes full script with timing, visuals, and
                voiceover or dialogue.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">UGC 15s</p>
              <p>
                Short-form user-generated content style scripts optimized for social platforms like
                TikTok or Instagram Reels.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">Influencer Brief</p>
              <p>
                Talking points and guidelines for influencer partners, including key messages and
                brand requirements.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">Hooks + Captions</p>
              <p>
                Collection of attention-grabbing opening hooks and social media captions for paid or
                organic posts.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">Punchlines + Alt Endings</p>
              <p>
                Alternate taglines and ending variations to test different creative directions or
                A/B test in production.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI generation modes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Use AI to generate different types of creative outputs:</p>
          <div className="grid gap-2">
            <div>
              <p className="font-medium text-foreground">Expand</p>
              <p>Take a concept or idea and develop it further with additional detail and depth.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Alternatives</p>
              <p>Generate multiple different approaches or variations on an existing idea.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Virality</p>
              <p>
                Analyze and enhance concepts for shareability, identifying what makes content spread.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">Pitch Outline</p>
              <p>Structure your concepts into a presentation-ready outline for client meetings.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">UGC Scripts</p>
              <p>Generate authentic-feeling scripts for user-generated content campaigns.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Storyboard</p>
              <p>Create frame-by-frame visual breakdowns with shot descriptions and shotlists.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">One Pager</p>
              <p>Condense your campaign into a single-page executive summary.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Press Release</p>
              <p>Draft announcement copy for campaign launches or news.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">FAQ</p>
              <p>Generate anticipated questions and answers about the campaign or product.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key concepts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Creative Map</p>
            <p>
              A structured summary of your brief containing the target audience, key message,
              constraints (what you must do and must avoid), and tone tags. The Creative Map keeps
              all generated content aligned with client requirements.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Concepts, Variants, and Scripts</p>
            <p>
              <span className="font-medium">Concepts</span> are your big creative ideas—the core
              campaign themes. <span className="font-medium">Variants</span> are different angles or
              takes on a concept (e.g., humorous vs. emotional). <span className="font-medium">Scripts</span>{" "}
              are the executable outputs in specific formats (30s spot, UGC, etc.) that bring
              variants to life.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Primary outputs</p>
            <p>
              Mark any script or output as &quot;primary&quot; to use it by default in exports and pitch
              packs. This helps when you have multiple versions and need to highlight the recommended
              one for the client.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Provenance labels</p>
            <p>
              Every piece of content is labeled with how it was created: <span className="font-medium">Human</span>{" "}
              (manually written), <span className="font-medium">AI Assisted</span> (AI-generated then
              edited by a human), or <span className="font-medium">AI Generated</span> (created
              entirely by AI). This transparency helps teams track authorship and maintain creative
              accountability.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Project statuses</p>
            <p>
              Track where each project stands: <span className="font-medium">Ideation</span>{" "}
              (developing concepts), <span className="font-medium">Pitch</span> (preparing for
              client), <span className="font-medium">Revision</span> (incorporating feedback),{" "}
              <span className="font-medium">Approved</span> (client signed off), or{" "}
              <span className="font-medium">Delivered</span> (work complete).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frequently asked questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Are my uploaded files stored on a server?</p>
            <p>
              No. PDF and PPTX files are parsed entirely in your browser. Only the extracted text
              content is saved to the database—the original files are never uploaded or stored.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Why are the AI features disabled?</p>
            <p>
              AI generation requires an OpenAI API key. Add <code className="rounded bg-muted px-1">OPENAI_API_KEY</code> to
              your <code className="rounded bg-muted px-1">.env.local</code> file and restart the development server. You
              can get an API key from the OpenAI platform.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">How can I control AI usage costs?</p>
            <p>
              Daily usage limits are applied per user to prevent runaway costs. You can also select
              lighter (faster and cheaper) models in the AI Models settings. Consider using smaller
              models for iterative drafting and reserving larger models for final outputs.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Can I work without AI?</p>
            <p>
              Yes. Every feature supports manual input. You can write concepts, scripts, and
              storyboards by hand. AI is optional and designed to accelerate your workflow, not
              replace your creative judgment.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">How do I customize what appears in the pitch pack?</p>
            <p>
              The Pitch view includes toggle controls at the top of the page. You can show or hide
              constraints, appendix outputs, references, feedback, provenance labels, and the image
              gallery. Select which concepts to feature by checking them in the concept selector.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">What is a key visual?</p>
            <p>
              Key visuals are AI-generated images that represent your concept visually. You can
              generate multiple images per concept and mark one as primary to feature it in pitch
              packs. These help clients visualize the creative direction before production.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keyboard shortcuts</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="grid gap-2">
            <div className="flex justify-between">
              <span>Navigate to Dashboard</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">G then D</kbd>
            </div>
            <div className="flex justify-between">
              <span>Navigate to Projects</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">G then P</kbd>
            </div>
            <div className="flex justify-between">
              <span>Navigate to Clients</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">G then C</kbd>
            </div>
            <div className="flex justify-between">
              <span>Open Help</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">?</kbd>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
