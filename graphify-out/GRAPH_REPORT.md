# Graph Report - /Users/zweaungnaing/Developer/Project/vibe-coding/hotel-chat-ui-demo  (2026-10-01)

## Corpus Check
- Corpus is ~31,520 words - fits in a single context window. You may not need a graph.

## Summary
- 769 nodes · 976 edges · 90 communities (64 shown, 26 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 68 edges (avg confidence: 0.8)
- Token usage: UNKNOWN / unmeasured; monetary cost: UNKNOWN / unmeasured

## Community Hubs (Navigation)
- [[_COMMUNITY_Package Build Tooling|Package Build Tooling]]
- [[_COMMUNITY_Runtime Package Dependencies|Runtime Package Dependencies]]
- [[_COMMUNITY_SocketIO Connection Lifecycle|SocketIO Connection Lifecycle]]
- [[_COMMUNITY_Sidebar Navigation Components|Sidebar Navigation Components]]
- [[_COMMUNITY_Shared UI Styling|Shared UI Styling]]
- [[_COMMUNITY_Application TypeScript Configuration|Application TypeScript Configuration]]
- [[_COMMUNITY_Widget TypeScript Configuration|Widget TypeScript Configuration]]
- [[_COMMUNITY_Token Server and QA|Token Server and QA]]
- [[_COMMUNITY_UI Component Configuration|UI Component Configuration]]
- [[_COMMUNITY_Chat Runtime Orchestration|Chat Runtime Orchestration]]
- [[_COMMUNITY_Tooling TypeScript Configuration|Tooling TypeScript Configuration]]
- [[_COMMUNITY_Menubar UI Components|Menubar UI Components]]
- [[_COMMUNITY_ChatBot Configuration Wrapper|ChatBot Configuration Wrapper]]
- [[_COMMUNITY_Authentication Token Validation|Authentication Token Validation]]
- [[_COMMUNITY_Legacy WebSocket Transport|Legacy WebSocket Transport]]
- [[_COMMUNITY_Runtime Transport Test Doubles|Runtime Transport Test Doubles]]
- [[_COMMUNITY_Carousel UI Components|Carousel UI Components]]
- [[_COMMUNITY_SocketIO Source Tests|SocketIO Source Tests]]
- [[_COMMUNITY_Calendar and Pagination|Calendar and Pagination]]
- [[_COMMUNITY_Item Layout Components|Item Layout Components]]
- [[_COMMUNITY_Chat Widget Interaction|Chat Widget Interaction]]
- [[_COMMUNITY_Form Context Components|Form Context Components]]
- [[_COMMUNITY_SocketIO Trigger Contracts|SocketIO Trigger Contracts]]
- [[_COMMUNITY_Chart UI Components|Chart UI Components]]
- [[_COMMUNITY_Code Formatting Configuration|Code Formatting Configuration]]
- [[_COMMUNITY_Command Palette Components|Command Palette Components]]
- [[_COMMUNITY_Context Menu Components|Context Menu Components]]
- [[_COMMUNITY_Dropdown Menu Components|Dropdown Menu Components]]
- [[_COMMUNITY_SocketIO Timing Tests|SocketIO Timing Tests]]
- [[_COMMUNITY_Alert Dialog Components|Alert Dialog Components]]
- [[_COMMUNITY_Input Group Components|Input Group Components]]
- [[_COMMUNITY_Sheet Overlay Components|Sheet Overlay Components]]
- [[_COMMUNITY_Table UI Components|Table UI Components]]
- [[_COMMUNITY_Chat Authentication Contracts|Chat Authentication Contracts]]
- [[_COMMUNITY_Breadcrumb Navigation Components|Breadcrumb Navigation Components]]
- [[_COMMUNITY_Drawer Overlay Components|Drawer Overlay Components]]
- [[_COMMUNITY_Empty State Components|Empty State Components]]
- [[_COMMUNITY_Navigation Menu Components|Navigation Menu Components]]
- [[_COMMUNITY_Select Input Components|Select Input Components]]
- [[_COMMUNITY_Documented Authentication Flow|Documented Authentication Flow]]
- [[_COMMUNITY_Host Document Events|Host Document Events]]
- [[_COMMUNITY_Card Layout Components|Card Layout Components]]
- [[_COMMUNITY_Dialog Overlay Components|Dialog Overlay Components]]
- [[_COMMUNITY_Connection Traffic Console|Connection Traffic Console]]
- [[_COMMUNITY_Safe Server Message Rendering|Safe Server Message Rendering]]
- [[_COMMUNITY_React Lint Configuration|React Lint Configuration]]
- [[_COMMUNITY_Widget Artifact Verification|Widget Artifact Verification]]
- [[_COMMUNITY_Project Integration Documentation|Project Integration Documentation]]
- [[_COMMUNITY_Planned ChatBot Migration|Planned ChatBot Migration]]
- [[_COMMUNITY_Alert Status Components|Alert Status Components]]
- [[_COMMUNITY_Button Group Components|Button Group Components]]
- [[_COMMUNITY_One-Time Password Inputs|One-Time Password Inputs]]
- [[_COMMUNITY_Demo Application Entrypoint|Demo Application Entrypoint]]
- [[_COMMUNITY_Accordion Disclosure Components|Accordion Disclosure Components]]
- [[_COMMUNITY_Avatar Display Components|Avatar Display Components]]
- [[_COMMUNITY_Badge Status Components|Badge Status Components]]
- [[_COMMUNITY_Tab Navigation Components|Tab Navigation Components]]
- [[_COMMUNITY_Toggle Group Components|Toggle Group Components]]
- [[_COMMUNITY_OpenCode Plugin Dependencies|OpenCode Plugin Dependencies]]
- [[_COMMUNITY_Planned Live Authentication Verification|Planned Live Authentication Verification]]
- [[_COMMUNITY_ChatBot Replacement Requirements|ChatBot Replacement Requirements]]
- [[_COMMUNITY_TypeScript Project References|TypeScript Project References]]
- [[_COMMUNITY_Form Label Components|Form Label Components]]
- [[_COMMUNITY_Radio Group Inputs|Radio Group Inputs]]
- [[_COMMUNITY_Scroll Area Components|Scroll Area Components]]
- [[_COMMUNITY_Toast Notification Components|Toast Notification Components]]
- [[_COMMUNITY_Toggle Control Components|Toggle Control Components]]
- [[_COMMUNITY_Checkbox Input Component|Checkbox Input Component]]
- [[_COMMUNITY_Hover Card Component|Hover Card Component]]
- [[_COMMUNITY_Text Input Component|Text Input Component]]
- [[_COMMUNITY_Popover Overlay Component|Popover Overlay Component]]
- [[_COMMUNITY_Progress Indicator Component|Progress Indicator Component]]
- [[_COMMUNITY_Separator Layout Component|Separator Layout Component]]
- [[_COMMUNITY_Slider Input Component|Slider Input Component]]
- [[_COMMUNITY_Loading Spinner Component|Loading Spinner Component]]
- [[_COMMUNITY_Switch Input Component|Switch Input Component]]
- [[_COMMUNITY_Textarea Input Component|Textarea Input Component]]
- [[_COMMUNITY_Tooltip Overlay Component|Tooltip Overlay Component]]
- [[_COMMUNITY_Favicon Logo Asset|Favicon Logo Asset]]
- [[_COMMUNITY_Favicon Logogram Asset|Favicon Logogram Asset]]
- [[_COMMUNITY_Empty Favicon Logotype|Empty Favicon Logotype]]
- [[_COMMUNITY_Deferred Integration Work|Deferred Integration Work]]
- [[_COMMUNITY_Selected Development Command|Selected Development Command]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 64 edges
2. `SocketIOMessageSource` - 43 edges
3. `FakeSocketIOMessageSource` - 22 edges
4. `compilerOptions` - 19 edges
5. `compilerOptions` - 17 edges
6. `compilerOptions` - 15 edges
7. `scripts` - 13 edges
8. `SocketIOConfiguration` - 11 edges
9. `ChatSessionContext` - 10 edges
10. `ConnectionState` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Live authentication gate (planned verification)` --semantically_similar_to--> `Live QA (unverified status)`  [INFERRED] [semantically similar]
  .opencode/plan/plan.md → README.md
- `AlertDialogHeader()` --calls--> `cn()`  [INFERRED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `AlertDialogFooter()` --calls--> `cn()`  [INFERRED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `BreadcrumbSeparator()` --calls--> `cn()`  [INFERRED]
  src/components/ui/breadcrumb.tsx → src/lib/utils.ts
- `BreadcrumbEllipsis()` --calls--> `cn()`  [INFERRED]
  src/components/ui/breadcrumb.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **UI replacement requirements** — prompt_prompt_frontend_reference_project, prompt_prompt_chatbot_replacement, prompt_prompt_shadcn_assistant_ui [EXTRACTED 1.00]
- **Runtime authentication and chat integration** — readme_auth_session, readme_chat_session_context, readme_runtime_jwt_flow, readme_socketio_messages, readme_host_document_events [EXTRACTED 1.00]
- **Planned migration components** — plan_plan_local_jwt_issuer, plan_plan_socketio_transport, plan_plan_reusable_wrapper, plan_plan_widget_package, plan_plan_live_gate [EXTRACTED 1.00]
- **Logo composition** — public_fav_logo, public_fav_logogram, public_fav_logotype [EXTRACTED 1.00]

## Communities (90 total, 26 thin omitted)

### Package Build Tooling
Cohesion: 0.04
Nodes (47): import, types, devDependencies, jsdom, jsrsasign, oxlint, postcss, postcss-selector-parser (+39 more)

### Runtime Package Dependencies
Cohesion: 0.04
Nodes (48): dependencies, @assistant-ui/react, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, @hookform/resolvers (+40 more)

### SocketIO Connection Lifecycle
Cohesion: 0.15
Nodes (4): cloneContext(), SocketIOMessageSource, ConnectionState, SocketIOConfiguration

### Sidebar Navigation Components
Cohesion: 0.07
Nodes (26): Sidebar, SidebarContent, SidebarContext, SidebarContextProps, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent (+18 more)

### Shared UI Styling
Cohesion: 0.14
Nodes (17): cn(), Field(), FieldContent(), FieldDescription(), FieldError(), FieldGroup(), FieldLabel(), FieldLegend() (+9 more)

### Application TypeScript Configuration
Cohesion: 0.09
Nodes (21): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+13 more)

### Widget TypeScript Configuration
Cohesion: 0.10
Nodes (20): compilerOptions, allowArbitraryExtensions, baseUrl, declaration, declarationDir, emitDeclarationOnly, ignoreDeprecations, jsx (+12 more)

### Token Server and QA
Cohesion: 0.16
Nodes (12): chat, clearTimers(), close(), finish(), recognized, timers, CONTEXT_KEYS, DEFAULT_ORIGINS (+4 more)

### UI Component Configuration
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, registries, @assistant-ui (+8 more)

### Chat Runtime Orchestration
Cohesion: 0.16
Nodes (10): UserMessage(), ChatMessage, ConnectionStatus, ChatRuntimeController, ChatRuntimeProvider(), ChatRuntimeProviderProps, SAFE_ERRORS, configuration() (+2 more)

### Tooling TypeScript Configuration
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Menubar UI Components
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### ChatBot Configuration Wrapper
Cohesion: 0.18
Nodes (8): ChatBot(), authProvider, captures, equalChatSessionContext(), isValidChatSessionContext(), resolveChatbotConfig(), ResolvedChatbotConfig, validateChatSessionContext()

### Authentication Token Validation
Cohesion: 0.21
Nodes (10): CONTEXT_KEYS, createLocalTokenProvider(), decode(), isContext(), isRecord(), sameContext(), b64(), context (+2 more)

### Legacy WebSocket Transport
Cohesion: 0.20
Nodes (6): IncomingMessage, ChatBotSource, ConnectionState, ConnectionStatus, SocketEvent, WebSocketSource

### Carousel UI Components
Cohesion: 0.14
Nodes (12): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+4 more)

### SocketIO Source Tests
Cohesion: 0.18
Nodes (7): b64(), context, Fake, fakeSocket(), session(), setup(), SocketEvent

### Calendar and Pagination
Cohesion: 0.15
Nodes (11): buttonVariants, Calendar(), CalendarDayButton(), Pagination(), PaginationContent, PaginationEllipsis(), PaginationItem, PaginationLink() (+3 more)

### Item Layout Components
Cohesion: 0.18
Nodes (12): Item(), ItemActions(), ItemContent(), ItemDescription(), ItemFooter(), ItemGroup(), ItemHeader(), ItemMedia() (+4 more)

### Chat Widget Interaction
Cohesion: 0.26
Nodes (8): ChatComposer(), ChatThread(), ChatWidget(), ChatWidgetProps, safeAvatar(), baseProps, Button, ButtonProps

### Form Context Components
Cohesion: 0.17
Nodes (9): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+1 more)

### SocketIO Trigger Contracts
Cohesion: 0.18
Nodes (5): Handler, SocketFactory, SocketIODependencies, SocketLike, SocketTrigger

### Chart UI Components
Cohesion: 0.18
Nodes (7): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES

### Code Formatting Configuration
Cohesion: 0.20
Nodes (9): endOfLine, plugins, printWidth, semi, singleQuote, tabWidth, tailwindFunctions, tailwindStylesheet (+1 more)

### Command Palette Components
Cohesion: 0.20
Nodes (8): Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut()

### Context Menu Components
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Dropdown Menu Components
Cohesion: 0.20
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### SocketIO Timing Tests
Cohesion: 0.25
Nodes (6): b64(), context, FakeSocket, Handler, session(), sources

### Alert Dialog Components
Cohesion: 0.22
Nodes (8): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle

### Input Group Components
Cohesion: 0.28
Nodes (8): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), InputGroupText(), InputGroupTextarea()

### Sheet Overlay Components
Cohesion: 0.22
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Table UI Components
Cohesion: 0.22
Nodes (8): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow

### Chat Authentication Contracts
Cohesion: 0.54
Nodes (5): AuthSession, ChatBotProps, ChatSessionContext, GetAuthToken, MessageSource

### Breadcrumb Navigation Components
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Drawer Overlay Components
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Empty State Components
Cohesion: 0.29
Nodes (7): Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle()

### Navigation Menu Components
Cohesion: 0.25
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Select Input Components
Cohesion: 0.25
Nodes (7): SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Documented Authentication Flow
Cohesion: 0.29
Nodes (7): AuthSession (implemented type contract), ChatSessionContext (implemented type contract), GetAuthToken (implemented type contract), Local token issuer (implemented repository description), Runtime JWT flow (implemented behavior description), Socket.IO chat source (implemented repository description), Socket.IO application messages (implemented protocol description)

### Host Document Events
Cohesion: 0.33
Nodes (5): attachHostEvents(), AUTH_EVENTS, HostEventCallbacks, LOGIN_EVENTS, LOGOUT_EVENTS

### Card Layout Components
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Dialog Overlay Components
Cohesion: 0.29
Nodes (6): DialogContent, DialogDescription, DialogFooter(), DialogHeader(), DialogOverlay, DialogTitle

### Safe Server Message Rendering
Cohesion: 0.47
Nodes (3): safeChatUrl(), ServerMessage(), messageState

### React Lint Configuration
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Widget Artifact Verification
Cohesion: 0.33
Nodes (4): files, lockfile, manifest, parsedCss

### Project Integration Documentation
Cohesion: 0.40
Nodes (5): Hotel Chat WebSocket Test page (implemented document title), Agent guidance (repository guidance), Host document events (implemented integration contract), React 19/Vite demo (implemented repository description), Packaged React widget (implemented repository description)

### Planned ChatBot Migration
Cohesion: 0.40
Nodes (5): Local JWT issuer (planned component), ChatBot migration plan (saved plan), Reusable ChatBot wrapper (planned component), Socket.IO transport (planned component), Widget package (planned packaging step)

### Alert Status Components
Cohesion: 0.40
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Button Group Components
Cohesion: 0.50
Nodes (4): ButtonGroup(), ButtonGroupSeparator(), ButtonGroupText(), buttonGroupVariants

### One-Time Password Inputs
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Accordion Disclosure Components
Cohesion: 0.50
Nodes (3): AccordionContent, AccordionItem, AccordionTrigger

### Avatar Display Components
Cohesion: 0.50
Nodes (3): Avatar, AvatarFallback, AvatarImage

### Badge Status Components
Cohesion: 0.67
Nodes (3): Badge(), BadgeProps, badgeVariants

### Tab Navigation Components
Cohesion: 0.50
Nodes (3): TabsContent, TabsList, TabsTrigger

### Toggle Group Components
Cohesion: 0.50
Nodes (3): ToggleGroup, ToggleGroupContext, ToggleGroupItem

### Planned Live Authentication Verification
Cohesion: 0.67
Nodes (3): Live authentication gate (planned verification), Live QA (unverified status), Offline verification evidence (reported verification)

### ChatBot Replacement Requirements
Cohesion: 0.67
Nodes (3): ChatBot component replacement (requirement), Frontend reference project (requirement), shadcn and assistant-ui UI (requirement)

## Knowledge Gaps
- **406 isolated node(s):** `@opencode-ai/plugin`, `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components` (+401 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Shared UI Styling` to `Breadcrumb Navigation Components`, `Drawer Overlay Components`, `Empty State Components`, `Dialog Overlay Components`, `Menubar UI Components`, `Loading Spinner Component`, `Calendar and Pagination`, `Button Group Components`, `Item Layout Components`, `Badge Status Components`, `Command Palette Components`, `Context Menu Components`, `Dropdown Menu Components`, `Alert Dialog Components`, `Input Group Components`, `Sheet Overlay Components`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Why does `buttonVariants` connect `Calendar and Pagination` to `Chat Widget Interaction`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `PaginationLink()` connect `Calendar and Pagination` to `Shared UI Styling`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Are the 63 inferred relationships involving `cn()` (e.g. with `AlertDialogFooter()` and `AlertDialogHeader()`) actually correct?**
  _`cn()` has 63 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@opencode-ai/plugin`, `$schema`, `plugins` to the rest of the system?**
  _411 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Package Build Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `Runtime Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
## Limitations and Provenance
- 374 dangling AST relationships were discarded during graph construction.
- 19 additional relationships were coalesced by the undirected simple graph (1369 extracted relationships - 374 dangling - 976 graph edges).
- 4 hyperedges are preserved separately and are not necessarily projected into pairwise connectivity.
- Plans and requirements are not proof of implementation.
- Usage metadata is not exposed for this run; token usage and monetary cost are UNKNOWN / unmeasured.
